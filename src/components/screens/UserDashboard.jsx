import ChartTooltip from '../common/ChartTooltip';
import { Link } from 'react-router-dom';
import MyAdsScreen from './MyAdsScreen';
import SellerStatsScreen from './SellerStatsScreen';
import { mexicoLocations, subcategoriesMap, mockAds, translations, spotlightRealEstate, jobsBoard, servicesMarketplace, automotiveDeals, recentlyViewed } from '../../constants/mockData';
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Shield, Pencil, PlusCircle, Activity, Heart, MapPin, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Camera, User, BadgeCheck, ShieldCheck, Building2, Zap, Ticket, Crown, Store, UploadCloud, LogOut, Settings, BarChart3, QrCode, Download, Loader2, Settings2, Globe, Sparkles, Play, Video, Phone, AlertTriangle, ArrowRight, ExternalLink, MessageCircle, Share2, Star, Info, HelpCircle, Menu, X, Bell, TrendingUp, PieChart as PieChartIcon, CreditCard } from "lucide-react";
export default function UserDashboard({ onRefreshAds, accountType, adStatusFilter, analyticsData, analyticsDays, catObj, categoriesData, companyForm, dashboardPage, dashboardTab, emailForm, emailLoading, favoriteAds, fileInputRef, form, getImageUrl, handleBulkUpload, handleClipPayment, handleDeleteAccount, handleDeleteAd, handleEditAd, handleEmailSubmit, handleExportCompanyData, handleLogout, handleNotificationsSubmit, handlePasswordSubmit, handlePromoteAd, handleRepublishAd, handleRenewAd, handleToggleAdStatus, handleToggleFavorite, isDarkMode, isUploadingBulk, lang, notifications, notificationsForm, notificationsLoading, openProfileModal, passwordForm, passwordLoading, renderUserDashboard, setAccountType, setAdStatusFilter, setAnalyticsDays, setCompanyForm, setCurrentTab, setDashboardPage, setDashboardTab, setEmailForm, setNotificationsForm, setPasswordForm, setShowCouponModal, setShowPricingModal, setSliderAutoplay, sliderAutoplay, t, user, userAds, userRole, userPayments, loadingUserPayments, userPaymentsPage, userPaymentsLastPage, userPaymentsTotal, loadUserPayments, token }) {
  const [dashToast, setDashToast] = React.useState(null);
  const showDashToast = (msg, type = 'success') => {
    setDashToast({ msg, type });
    setTimeout(() => setDashToast(null), 3000);
  };
    const activeAds = userAds.filter(ad => ad.status === 'active' || ad.status === 'pending');

    React.useEffect(() => {
        if (dashboardTab === 'transactions') {
            loadUserPayments(1);
        }
    }, [dashboardTab, loadUserPayments]);

    const getDaysUntilExpiry = (expiresAt) => {
      if (!expiresAt) return null;
      const diff = new Date(expiresAt) - new Date();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const totalViews = userAds.reduce((sum, ad) => sum + (ad.views || 0), 0);

    const inactiveAds = userAds.filter(ad => ['inactive', 'rejected', 'paused', 'expired'].includes(ad.status));

    const displayedAds = dashboardTab === 'my_ads' ? (adStatusFilter === 'active' ? activeAds : inactiveAds) : favoriteAds;

    const totalContactClicks = userAds.reduce((sum, ad) => sum + (ad.whatsapp_clicks || 0), 0);

    const conversionRate = (() => {

      if (totalViews === 0) return "0.0";

      return ((totalContactClicks / totalViews) * 100).toFixed(1);

    })();

    const businessName = companyForm?.name?.trim()
      || user?.company_name
      || user?.name
      || t.complete_business_profile
      || 'Completa tu perfil de empresa';
    const businessSubtitle = companyForm?.website?.trim()
      || user?.email
      || t.complete_business_profile_hint
      || 'Agrega los datos de tu negocio para vender como PRO';
    const accountVerified = Boolean(user?.account_verified || user?.email_verified || user?.email_verified_at || user?.phone_verified || user?.is_verified || user?.kyc_status === 'approved');
    const verificationMethods = user?.account_verification_methods || [];
    const hasEmailVerified = Boolean(user?.email_verified || user?.email_verified_at || verificationMethods.includes('email'));
    const hasPhoneVerified = Boolean(user?.phone_verified || verificationMethods.includes('phone'));
    const hasTrustBadge = Boolean(user?.is_verified || verificationMethods.includes('admin') || user?.kyc_status === 'approved');

    

    const categoryStats = (() => {

      const stats = {};

      userAds.forEach(ad => {

        const cat = ad.category || 'general';

        stats[cat] = (stats[cat] || 0) + 1;

      });

      return Object.entries(stats).map(([slug, count]) => {

        const catObj = categoriesData.find(c => c.slug === slug);

        const name = catObj ? (catObj.name?.[lang] || catObj.name?.['es'] || catObj.name) : slug;

        return { name, value: count };

      }).sort((a, b) => b.value - a.value);

    })();

    

    const itemsPerPage = 5;

    const totalPages = Math.ceil(displayedAds.length / itemsPerPage);

    const safeDashboardPage = Math.min(dashboardPage, Math.max(1, totalPages));

    const paginatedAds = displayedAds.slice((safeDashboardPage - 1) * itemsPerPage, safeDashboardPage * itemsPerPage);



    return (

      <div className="bg-[var(--paper)] min-h-screen pb-6 md:pb-12 w-full">

        <div className="p-4 md:p-8 w-full max-w-[1200px] mx-auto">

          <div className="flex justify-end mb-4">

             <div className="bg-slate-200 p-1 rounded-xl flex items-center w-fit">

                <button onClick={() => setAccountType('particular')} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${accountType === 'particular' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.particular}</button>

                <button onClick={() => setAccountType('pro')} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${accountType === 'pro' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>PRO</button>

             </div>

          </div>



          {/* Account verification status */}
          {user && !accountVerified && (
            <div className="mb-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-bold text-amber-950 dark:text-amber-100 text-[15px]">Cuenta no verificada</h3>
                  <p className="text-[13px] text-amber-800 dark:text-amber-200 mt-1">Confirma tu email, teléfono o solicita verificación para aumentar la confianza de compradores y vendedores.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {hasEmailVerified ? (
                  <span className="btn-sm bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default font-semibold text-[12px] flex items-center gap-1"><CheckCircle size={14}/> Email verificado</span>
                ) : (
                  <button onClick={async () => {
                    try {
                      const tok = localStorage.getItem('auth_token');
                      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api'}/email/send-verification`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${tok}` }
                      });
                      if (r.ok) {
                        showDashToast('Email de verificación enviado.', 'success');
                      } else {
                        showDashToast('No se pudo enviar el email.', 'error');
                      }
                    } catch (err) { showDashToast('Error de conexión.', 'error'); }
                  }} className="btn-sm bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[12px]">Verificar email</button>
                )}
                <span className={`btn-sm border cursor-default font-semibold text-[12px] flex items-center gap-1 ${hasPhoneVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}>
                  {hasPhoneVerified ? <CheckCircle size={14}/> : <Phone size={14}/>} Teléfono {hasPhoneVerified ? 'verificado' : 'pendiente'}
                </span>
              </div>
            </div>
          )}

          <h1 className="hidden md:block text-[24px] font-bold text-slate-900 mb-6">{t.dashboard}</h1>

          

          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-6 shadow-sm">

            <div onClick={openProfileModal} className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-white ${accountType === 'pro' ? 'bg-slate-900' : 'bg-slate-100'} overflow-hidden relative group cursor-pointer shadow-inner`}>

              {user?.avatar_url ? (

                <img src={getImageUrl(user.avatar_url)} className="w-full h-full object-cover" alt="User Avatar" />

              ) : (accountType === 'pro' ? <Building2 className="w-8 h-8" /> : <User className="w-8 h-8 text-slate-400" />)}

              <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all">

                 <Camera className="w-6 h-6 text-white" />

              </div>

            </div>

            <div className="flex-1">

              <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">

                {accountType === 'pro' ? businessName : (user?.name || 'Invitado')}

                {accountType === 'pro' && <span className="badge bg-slate-900 text-white">PRO</span>}

                {userRole === 'admin' && <span className="badge bg-red-500 text-white">ADMIN</span>}

                {accountVerified ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-[11px] font-bold border border-emerald-100"><CheckCircle size={14}/> Cuenta verificada</span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg text-[11px] font-bold border border-amber-100"><XCircle size={14}/> Cuenta no verificada</span>
                )}
                {hasTrustBadge && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-[11px] font-bold border border-blue-100"><BadgeCheck size={14}/> Vendedor verificado</span>
                )}

              </h2>

              <p className="text-[14px] text-slate-500 mt-1">{accountType === 'pro' ? businessSubtitle : (user?.email || 'N/A')}</p>

            </div>

            

            <div className="flex flex-col sm:flex-row gap-3 md:ml-auto items-center">

              <div className="bg-amber-100 text-amber-800 px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold text-[14px] shadow-sm relative group">

                  <Zap size={18} className="text-amber-500 fill-amber-500"/>

                  {parseFloat(user?.balance || 0).toFixed(0)} {t.credits_unit || 'Créditos'}

                  <button onClick={() => handleClipPayment(100, `100 ${t.credits_unit || 'Créditos'} Mercasto`)} className="ml-1 bg-amber-500 text-white w-6 h-6 rounded-md flex items-center justify-center hover:bg-amber-600 transition-colors shadow-sm" title={t.credits_btn_title || 'Comprar créditos'}>+</button>

                  <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none group-hover:pointer-events-auto">

                    <button onClick={() => setShowCouponModal(true)} className="bg-white border border-slate-200 text-slate-700 text-[12px] px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap hover:bg-slate-50 flex items-center gap-1.5"><Ticket size={14}/> {t.redeem_coupon || 'Canjear cupón'}</button>

                  </div>

              </div>

              {userRole === 'admin' && (

                <button onClick={() => setCurrentTab('admin')} className="btn-md bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center gap-2 shadow-sm">

                   <Shield className="w-4 h-4"/> {t.admin_panel}

                </button>

              )}

              {accountType === 'particular' && (

                <button onClick={() => setShowPricingModal(true)} className="btn-md bg-amber-400 hover:bg-amber-500 text-amber-900 flex items-center justify-center gap-2 shadow-sm">

                   <Crown className="w-4 h-4"/> {t.upgrade_pro}

                </button>

              )}

            </div>

          </div>



          <div className="flex flex-col md:flex-row gap-6 w-full">

            <div className="md:w-1/3 lg:w-1/4 flex flex-col gap-4">

              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">

                <div onClick={() => setDashboardTab('my_ads')} className={`p-4 flex items-center gap-3 border-b border-slate-100 cursor-pointer transition-colors text-[14px] font-medium ${dashboardTab === 'my_ads' ? 'text-[#65A30D] bg-lime-50/50' : 'text-slate-700 hover:bg-slate-50'}`}>

                  <CheckCircle className={`w-5 h-5 ${dashboardTab === 'my_ads' ? 'text-[#84CC16]' : 'text-slate-400'}`}/> {t.my_ads}

                </div>

                {accountType === 'particular' && (

                  <div onClick={() => setDashboardTab('favorites')} className={`p-4 flex items-center gap-3 border-b border-slate-100 cursor-pointer transition-colors text-[14px] font-medium ${dashboardTab === 'favorites' ? 'text-red-600 bg-red-50/50' : 'text-slate-700 hover:bg-slate-50'}`}>

                    <Heart className={`w-5 h-5 ${dashboardTab === 'favorites' ? 'text-red-500 fill-red-500' : 'text-slate-400'}`}/> {t.favorites}

                  </div>

                )}

                {accountType === 'pro' && (

                  <>

                    <div onClick={() => setDashboardTab('company')} className={`p-4 flex items-center gap-3 border-b border-slate-100 cursor-pointer transition-colors text-[14px] font-medium ${dashboardTab === 'company' ? 'text-[#65A30D] bg-lime-50/50' : 'text-slate-700 hover:bg-slate-50'}`}>

                      <Store className={`w-5 h-5 ${dashboardTab === 'company' ? 'text-[#84CC16]' : 'text-slate-400'}`}/> {t.company_profile}

                    </div>

                    <div onClick={() => fileInputRef.current?.click()} className="p-4 flex items-center gap-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors text-slate-700 text-[14px] font-medium relative">

                      {isUploadingBulk ? <Loader2 className="w-5 h-5 text-purple-500 animate-spin"/> : <UploadCloud className="w-5 h-5 text-purple-500"/>} 

                      {isUploadingBulk ? (t.uploading_word || 'Subiendo...') : t.mass_upload}

                      <input type="file" accept=".csv,.xml" className="hidden" ref={fileInputRef} onChange={handleBulkUpload} />

                    </div>

                  </>

                )}

                <Link to="/referidos" className="p-4 flex items-center gap-3 border-b border-slate-100 cursor-pointer transition-colors text-[14px] font-medium text-slate-700 hover:bg-slate-50 hover:text-[#65A30D]">
                  <Share2 className="w-5 h-5 text-slate-400"/> {t.referrals_tab || 'Referidos'}
                </Link>

                <div onClick={() => setDashboardTab('stats')} className={`p-4 flex items-center gap-3 border-b border-slate-100 cursor-pointer transition-colors text-[14px] font-medium ${dashboardTab === 'stats' ? 'text-[#65A30D] bg-lime-50/50' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <BarChart3 className={`w-5 h-5 ${dashboardTab === 'stats' ? 'text-[#84CC16]' : 'text-slate-400'}`}/> Estadísticas
                </div>
                <div onClick={() => setDashboardTab('transactions')} className={`p-4 flex items-center gap-3 border-b border-slate-100 cursor-pointer transition-colors text-[14px] font-medium ${dashboardTab === 'transactions' ? 'text-[#65A30D] bg-lime-50/50' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <CreditCard className={`w-5 h-5 ${dashboardTab === 'transactions' ? 'text-[#84CC16]' : 'text-slate-400'}`}/> {t.transactions_tab || 'Transacciones'}
                </div>

                <div onClick={() => setDashboardTab('settings')} className={`p-4 flex items-center gap-3 border-b border-slate-100 cursor-pointer transition-colors text-[14px] font-medium ${dashboardTab === 'settings' ? 'text-[#65A30D] bg-lime-50/50' : 'text-slate-700 hover:bg-slate-50'}`}>

                  <Settings className={`w-5 h-5 ${dashboardTab === 'settings' ? 'text-[#84CC16]' : 'text-slate-400'}`}/> {t.settings}

                </div>

                {userRole === 'admin' && (

                  <div onClick={() => setCurrentTab('admin')} className="p-4 flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors text-red-600 text-[14px] font-semibold border-t border-slate-100">

                    <Shield className="w-5 h-5 text-red-500"/> {t.admin_panel}

                  </div>

                )}

              </div>

              

              <button onClick={handleLogout} className="w-full bg-white border border-slate-200 text-red-600 font-semibold rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">

                <LogOut className="w-5 h-5" /> {t.logout}

              </button>

            </div>



            <div className="md:w-2/3 lg:w-3/4 flex flex-col gap-6">

              {accountType === 'pro' && dashboardTab !== 'company' && dashboardTab !== 'settings' && dashboardTab !== 'transactions' && (

                <>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">

                    <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.active_ads}</p>

                    <p className="text-2xl md:text-3xl font-black text-slate-900">{activeAds.length}</p>

                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">

                    <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.total_views}</p>

                    <p className="text-2xl md:text-3xl font-black text-[#84CC16]">{totalViews}</p>

                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">

                    <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.contacts_qr}</p>

                    <p className="text-2xl md:text-3xl font-black text-slate-900">{totalContactClicks}</p>

                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">

                    <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.conversion}</p>

                    <p className="text-2xl md:text-3xl font-black text-blue-500">{conversionRate}%</p>

                  </div>

                </div>



                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">

                    <h3 className="text-[18px] font-bold text-slate-900">Rendimiento</h3>

                    <select 

                      value={analyticsDays} 

                      onChange={(e) => setAnalyticsDays(Number(e.target.value))}

                      className="bg-slate-50 border border-slate-200 text-slate-700 text-[13px] font-medium rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#84CC16]/30 cursor-pointer w-full sm:w-auto"

                    >

                      <option value={7}>Últimos 7 días</option>

                      <option value={14}>Últimos 14 días</option>

                      <option value={30}>Últimos 30 días</option>

                    </select>

                  </div>

                  

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-8 mt-4">

                    {/* Vistas Chart */}

                    <div className="w-full">

                      <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2"><BarChart3 className="w-4 h-4"/> Vistas</h4>

                      <div className="h-56 w-full">

                        {analyticsData.length > 0 ? (

                          <ResponsiveContainer width="100%" height="100%">

                            <AreaChart data={analyticsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>

                              <defs>

                                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">

                                  <stop offset="5%" stopColor={isDarkMode ? "#F8FAFC" : "#0F172A"} stopOpacity={0.3}/>

                                  <stop offset="95%" stopColor={isDarkMode ? "#F8FAFC" : "#0F172A"} stopOpacity={0}/>

                                </linearGradient>

                              </defs>

                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#E2E8F0"} />

                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 }} tickMargin={10} minTickGap={20} />

                              <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 }} allowDecimals={false} />

                              <Tooltip content={<ChartTooltip unit="vistas" isDarkMode={isDarkMode} />} cursor={{ stroke: isDarkMode ? '#64748B' : '#94A3B8', strokeWidth: 1, strokeDasharray: '3 3' }} />

                              <Area type="monotone" dataKey="views" stroke={isDarkMode ? "#F8FAFC" : "#0F172A"} strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" activeDot={{ r: 6, fill: isDarkMode ? "#F8FAFC" : "#0F172A", stroke: isDarkMode ? '#1E293B' : '#fff', strokeWidth: 2 }} />

                            </AreaChart>

                          </ResponsiveContainer>

                        ) : (

                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-[13px] font-medium">No hay datos...</div>

                        )}

                      </div>

                    </div>



                    {/* Contact Clicks Chart */}

                    <div className="w-full">

                      <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2"><QrCode className="w-4 h-4"/> Contactos (QR)</h4>

                      <div className="h-56 w-full">

                        {analyticsData.length > 0 ? (

                          <ResponsiveContainer width="100%" height="100%">

                            <AreaChart data={analyticsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>

                              <defs>

                                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">

                                  <stop offset="5%" stopColor="#84CC16" stopOpacity={0.4}/>

                                  <stop offset="95%" stopColor="#84CC16" stopOpacity={0}/>

                                </linearGradient>

                              </defs>

                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#E2E8F0"} />

                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 }} tickMargin={10} minTickGap={20} />

                              <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 }} allowDecimals={false} />

                              <Tooltip content={<ChartTooltip unit="clicks" isDarkMode={isDarkMode} />} cursor={{ stroke: isDarkMode ? '#64748B' : '#94A3B8', strokeWidth: 1, strokeDasharray: '3 3' }} />

                              <Area type="monotone" dataKey="clicks" stroke="#84CC16" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" activeDot={{ r: 6, fill: '#84CC16', stroke: isDarkMode ? '#1E293B' : '#fff', strokeWidth: 2 }} />

                            </AreaChart>

                          </ResponsiveContainer>

                        ) : (

                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-[13px] font-medium">No hay datos...</div>

                        )}

                      </div>

                    </div>



                    {/* Categories Pie Chart */}

                    <div className="w-full">

                      <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2"><PieChartIcon className="w-4 h-4"/> Categorías</h4>

                      <div className="h-56 w-full">

                        {categoryStats.length > 0 ? (

                          <ResponsiveContainer width="100%" height="100%">

                            <PieChart>

                              <Pie

                                data={categoryStats}

                                cx="50%"

                                cy="50%"

                                innerRadius={55}

                                outerRadius={80}

                                paddingAngle={3}

                                dataKey="value"

                                stroke="none"

                              >

                                {categoryStats.map((entry, index) => {

                                  const COLORS = ['#84CC16', isDarkMode ? '#F8FAFC' : '#0F172A', '#3B82F6', '#F59E0B', '#8B5CF6', '#10B981'];

                                  return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;

                                })}

                              </Pie>

                              <Tooltip content={({ active, payload }) => {

                                if (active && payload && payload.length) {

                                  return (

                                    <div className={`text-center px-3 py-2 rounded-xl shadow-xl border ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-slate-900 border-slate-700 text-white'}`}>

                                      <div className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-300'}`}>{payload[0].name}</div>

                                      <div className="text-[12px] font-bold">{payload[0].value} {payload[0].value === 1 ? 'anuncio' : 'anuncios'}</div>

                                    </div>

                                  );

                                }

                                return null;

                              }} />

                            </PieChart>

                          </ResponsiveContainer>

                        ) : (

                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-[13px] font-medium">No hay datos...</div>

                        )}

                      </div>

                    </div>

                  </div>

                </div>

                </>

              )}



              {dashboardTab === 'settings' ? (

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex-1 p-6 md:p-8">

                  <h2 className="text-[18px] font-bold text-slate-900 mb-6">{t.settings}</h2>

                  <div className="space-y-6">

                    <div>

                      <h3 className="text-[15px] font-semibold text-slate-900 mb-2">{t.personal_info}</h3>

                      <p className="text-[13px] text-slate-600 mb-4">{t.update_photo}</p>

                      <Link to="/perfil/editar" className="btn-md border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2"><User className="w-4 h-4" /> {t.edit_profile || 'Editar perfil'}</Link>

                    </div>

                    <hr className="border-slate-100" />

                    <div>

                      <h3 className="text-[15px] font-semibold text-slate-900 mb-2">{t.security}</h3>

                      <p className="text-[13px] text-slate-600 mb-4">{t.update_password}</p>

                      <form onSubmit={handlePasswordSubmit} className="space-y-3 max-w-sm">

                         <input type="password" placeholder={t.curr_password} value={passwordForm.current_password} onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]" />

                         <input type="password" required placeholder={t.new_password} minLength={8} value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]" />

                         <input type="password" required placeholder={t.conf_password} minLength={8} value={passwordForm.confirm_password} onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]" />

                         <button type="submit" disabled={passwordLoading} className="btn-md bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-2">

                           {passwordLoading ? <Loader2 className="animate-spin w-4 h-4"/> : t.update_pass_btn}

                         </button>

                      </form>

                    </div>

                    <hr className="border-slate-100" />

                    <div>

                      <h3 className="text-[15px] font-semibold text-slate-900 mb-2">{t.email_settings}</h3>

                      <p className="text-[13px] text-slate-600 mb-4">{t.update_email}</p>

                      <form onSubmit={handleEmailSubmit} className="space-y-3 max-w-sm">

                        <input type="email" required placeholder={t.new_email} value={emailForm.new_email} onChange={e => setEmailForm({...emailForm, new_email: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]" />

                        <input type="password" required placeholder={t.curr_password} value={emailForm.password} onChange={e => setEmailForm({...emailForm, password: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]" />

                        <button type="submit" disabled={emailLoading} className="btn-md bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-2">

                          {emailLoading ? <Loader2 className="animate-spin w-4 h-4"/> : t.req_change}

                        </button>

                      </form>

                    </div>

                    <hr className="border-slate-100" />

                    <div>

                      <h3 className="text-[15px] font-semibold text-slate-900 mb-2">{t.notifications}</h3>

                      <p className="text-[13px] text-slate-600 mb-4">{t.choose_alerts}</p>

                      <form onSubmit={handleNotificationsSubmit} className="space-y-4 max-w-sm">

                        <label className="flex items-center gap-3 cursor-pointer">

                          <input type="checkbox" checked={notificationsForm.email_alerts} onChange={e => setNotificationsForm({...notificationsForm, email_alerts: e.target.checked})} className="w-4 h-4 text-[#84CC16] rounded border-slate-300 focus:ring-[#84CC16]" />

                          <span className="text-[14px] text-slate-700">{t.email_alerts}</span>

                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">

                          <input type="checkbox" checked={notificationsForm.push_notifications} onChange={e => setNotificationsForm({...notificationsForm, push_notifications: e.target.checked})} className="w-4 h-4 text-[#84CC16] rounded border-slate-300 focus:ring-[#84CC16]" />

                          <span className="text-[14px] text-slate-700">{t.push_alerts}</span>

                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">

                          <input type="checkbox" checked={notificationsForm.marketing} onChange={e => setNotificationsForm({...notificationsForm, marketing: e.target.checked})} className="w-4 h-4 text-[#84CC16] rounded border-slate-300 focus:ring-[#84CC16]" />

                          <span className="text-[14px] text-slate-700">{t.marketing_alerts}</span>

                        </label>

                        <button type="submit" disabled={notificationsLoading} className="btn-md bg-[#0F172A] text-white hover:bg-black flex items-center justify-center gap-2 mt-2">

                          {notificationsLoading ? <Loader2 className="animate-spin w-4 h-4"/> : t.save_prefs}

                        </button>

                      </form>

                    </div>

                    <hr className="border-slate-100" />

                    <div>

                      <h3 className="text-[15px] font-semibold text-slate-900 mb-2">{t.interface}</h3>

                      <p className="text-[13px] text-slate-600 mb-4">{t.customize_app}</p>

                      <div className="space-y-4 max-w-sm">

                        <label className="flex items-center gap-3 cursor-pointer">

                          <input type="checkbox" checked={sliderAutoplay} onChange={e => setSliderAutoplay(e.target.checked)} className="w-4 h-4 text-[#84CC16] rounded border-slate-300 focus:ring-[#84CC16]" />

                          <span className="text-[14px] text-slate-700">{t.autoplay}</span>

                        </label>

                      </div>

                    </div>

                    <hr className="border-slate-100" />

                    <div>

                      <h3 className="text-[15px] font-semibold text-red-600 mb-2">{t.danger_zone}</h3>

                      <p className="text-[13px] text-slate-600 mb-4">{t.del_warning}</p>

                      <button onClick={handleDeleteAccount} className="btn-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 flex items-center gap-2"><Trash2 className="w-4 h-4" /> {t.del_account}</button>

                    </div>

                  </div>

                </div>

              ) : dashboardTab === 'company' ? (

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex-1 p-6 md:p-8">

                  <div className="flex items-center justify-between mb-6">

                    <h2 className="text-[18px] font-bold text-slate-900">{t.company_profile}</h2>

                    <button onClick={handleExportCompanyData} type="button" className="btn-sm border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2">

                      <Download className="w-4 h-4" /> {t.export_json}

                    </button>

                  </div>

                  <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); showDashToast('Perfil de empresa actualizado exitosamente.'); }}>

                    <div>

                      <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.cover_photo}</label>

                      <label className="w-full h-32 md:h-48 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors group relative overflow-hidden">

                        {companyForm.coverPreview && <img src={companyForm.coverPreview} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" alt="Cover" />}

                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform mb-2 relative z-10">

                          <Camera className="w-6 h-6 text-slate-400" />

                        </div>

                        <span className="text-[13px] font-medium text-slate-600 relative z-10">{t.upload_cover}</span>

                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {

                          if (e.target.files && e.target.files[0]) {

                            setCompanyForm({...companyForm, coverPreview: URL.createObjectURL(e.target.files[0])});

                          }

                        }} />

                      </label>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                      <div className="md:col-span-2">

                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.comp_name}</label>

                        <input type="text" value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />

                      </div>

                      <div className="md:col-span-2">

                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.comp_desc}</label>

                        <textarea rows="4" value={companyForm.description} onChange={e => setCompanyForm({...companyForm, description: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all"></textarea>

                      </div>

                      <div>

                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.website}</label>

                        <input type="url" value={companyForm.website} onChange={e => setCompanyForm({...companyForm, website: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />

                      </div>

                      <div>

                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.phone}</label>

                        <input type="tel" value={companyForm.phone} onChange={e => setCompanyForm({...companyForm, phone: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />

                      </div>

                      <div className="md:col-span-2">

                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">{t.address}</label>

                        <input type="text" value={companyForm.address} onChange={e => setCompanyForm({...companyForm, address: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px] transition-all" />

                      </div>

                    </div>

                    <div className="pt-2 flex justify-end">

                      <button type="submit" className="btn-md bg-[#0F172A] text-white hover:bg-black shadow-sm">

                        {t.save_changes}

                      </button>

                    </div>

                  </form>

                </div>

          ) : dashboardTab === 'stats' ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex-1 p-6 md:p-8">
              <SellerStatsScreen token={token} />
            </div>
          ) : dashboardTab === 'my_ads' ? (
            <MyAdsScreen
              userAds={userAds}
              getImageUrl={getImageUrl}
              handleDeleteAd={handleDeleteAd}
              handleToggleAdStatus={handleToggleAdStatus}
              handlePromoteAd={handlePromoteAd}
              handleRepublishAd={handleRepublishAd}
              handleRenewAd={handleRenewAd}
              user={user}
              t={t}
              lang={lang}
              accountType={accountType}
              setCurrentTab={setCurrentTab}
              setShowPricingModal={setShowPricingModal}
              onRefreshAds={onRefreshAds}
            />
          ) : dashboardTab === 'transactions' ? (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex-1 p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#84CC16]" /> {t.transactions_title || 'Historial de Transacciones'}
                  </h2>
                  <p className="text-[13px] text-slate-500 mt-1">
                    {t.transactions_desc || 'Consulta el registro de tus compras de créditos, promociones y recargas en Mercasto.'}
                  </p>
                </div>
                <button 
                  onClick={() => loadUserPayments(1)} 
                  disabled={loadingUserPayments}
                  className="btn-sm border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 self-end sm:self-auto"
                >
                  {loadingUserPayments ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#84CC16]" />
                  ) : (
                    <Activity className="w-4 h-4 text-slate-500" />
                  )}
                  {t.refresh_btn || 'Actualizar'}
                </button>
              </div>

              {loadingUserPayments ? (
                <div className="space-y-4 py-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="border border-slate-100 rounded-2xl p-4 animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                          <div className="w-5 h-5 bg-slate-200 rounded-full" />
                        </div>
                        <div>
                          <div className="h-4 bg-slate-200 rounded-md w-40 mb-2" />
                          <div className="h-3 bg-slate-100 rounded-md w-24" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="h-4 bg-slate-200 rounded-md w-20" />
                        <div className="h-6 bg-slate-100 rounded-full w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : userPayments.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-6 bg-slate-50/30">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-4 shadow-sm">
                    <CreditCard className="w-8 h-8" />
                  </div>
                  <h3 className="text-[16px] font-bold text-slate-900 mb-1">{t.no_transactions || 'Sin transacciones registradas'}</h3>
                  <p className="text-[13px] text-slate-500 max-w-sm mb-6">
                    {t.no_transactions_desc || 'Aún no has realizado ninguna compra de créditos. Puedes recargar saldo para destacar tus anuncios o acceder a funciones PRO.'}
                  </p>
                  <button 
                    onClick={() => handleClipPayment(100, `100 ${t.credits_unit || 'Créditos'} Mercasto`)}
                    className="btn-md bg-[#0F172A] hover:bg-black text-white flex items-center gap-2 shadow-sm font-semibold text-[13px]"
                  >
                    <Zap size={16} className="text-amber-500 fill-amber-500" />
                    {t.buy_credits_offer || 'Comprar 100 Créditos ($100 MXN)'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="hidden md:block overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 text-slate-500 font-semibold text-[12px] uppercase tracking-wider border-b border-slate-100">
                          <th className="py-4 px-5">{t.concept || 'Concepto'}</th>
                          <th className="py-4 px-5">{t.clip_ref || 'Referencia de pago'}</th>
                          <th className="py-4 px-5">{t.date || 'Fecha'}</th>
                          <th className="py-4 px-5">{t.amount || 'Monto'}</th>
                          <th className="py-4 px-5 text-right">{t.status || 'Estado'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[14px]">
                        {userPayments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-5 font-semibold text-slate-900">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                                  {payment.description?.toLowerCase().includes('crédito') || payment.description?.toLowerCase().includes('credito') ? (
                                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                                  ) : (
                                    <CreditCard className="w-4 h-4 text-blue-500" />
                                  )}
                                </div>
                                <span className="line-clamp-1">{payment.description || t.payment_service_fallback || 'Compra de Servicios'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-5 text-slate-600 font-mono text-[12px]">
                              {payment.clip_checkout_id ? (
                                <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 select-all" title={t.click_to_select || 'Click para seleccionar'}>
                                  {payment.clip_checkout_id.substring(0, 16)}...
                                </span>
                              ) : (
                                <span className="text-slate-400">N/A</span>
                              )}
                            </td>
                            <td className="py-4 px-5 text-slate-500">
                              {payment.created_at ? new Date(payment.created_at).toLocaleString(lang === 'es' ? 'es-MX' : lang === 'pt' ? 'pt-BR' : 'en-US', {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              }) : 'N/A'}
                            </td>
                            <td className="py-4 px-5 font-black text-slate-900">
                              ${parseFloat(payment.amount).toFixed(2)} MXN
                            </td>
                            <td className="py-4 px-5 text-right">
                              {payment.status === 'paid' || payment.status === 'succeeded' || payment.status === 'approved' ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[12px] font-bold border border-emerald-100">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  {t.payment_status_approved || 'Aprobado'}
                                </span>
                              ) : payment.status === 'pending' ? (
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[12px] font-bold border border-amber-100">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  {t.payment_status_pending || 'Pendiente'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-[12px] font-bold border border-red-100">
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

                  <div className="md:hidden space-y-3">
                    {userPayments.map((payment) => (
                      <div key={payment.id} className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                              {payment.description?.toLowerCase().includes('crédito') || payment.description?.toLowerCase().includes('credito') ? (
                                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              ) : (
                                <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                              )}
                            </div>
                            <span className="font-semibold text-slate-900 text-[13px] line-clamp-1">{payment.description || t.payment_service_fallback || 'Compra de Servicios'}</span>
                          </div>
                          {payment.status === 'paid' || payment.status === 'succeeded' || payment.status === 'approved' ? (
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[11px] font-bold border border-emerald-100">
                              {t.payment_status_approved || 'Aprobado'}
                            </span>
                          ) : payment.status === 'pending' ? (
                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[11px] font-bold border border-amber-100">
                              {t.payment_status_pending || 'Pendiente'}
                            </span>
                          ) : (
                            <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-[11px] font-bold border border-red-100">
                              {t.payment_status_failed || 'Fallido'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[12px] text-slate-500 pt-1 border-t border-slate-50">
                          <span>
                            {payment.created_at ? new Date(payment.created_at).toLocaleDateString(lang === 'es' ? 'es-MX' : lang === 'pt' ? 'pt-BR' : 'en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            }) : 'N/A'}
                          </span>
                          <span className="font-bold text-slate-900">
                            ${parseFloat(payment.amount).toFixed(2)} MXN
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {userPaymentsLastPage > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 bg-slate-50/50 -mx-6 -mb-6 md:-mx-8 md:-mb-8 px-6 py-4 md:px-8">
                      <span className="text-[13px] text-slate-500 font-medium">
                        {t.page_word || 'Página'} {userPaymentsPage} {t.of_word || 'de'} {userPaymentsLastPage} ({userPaymentsTotal} {t.total_word || 'total'})
                      </span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => loadUserPayments(userPaymentsPage - 1)}
                          disabled={userPaymentsPage === 1}
                          className="btn-sm border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white text-slate-700 transition-all font-semibold"
                        >
                          {t.prev_btn || 'Anterior'}
                        </button>
                        <button 
                          onClick={() => loadUserPayments(userPaymentsPage + 1)}
                          disabled={userPaymentsPage === userPaymentsLastPage}
                          className="btn-sm border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white text-slate-700 transition-all font-semibold"
                        >
                          {t.next_btn || 'Siguiente'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (

            <>

              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex-1">

                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">

                  <h2 className="text-[18px] font-bold text-slate-900">

                    {dashboardTab === 'my_ads' ? t.my_ads : t.favorites} 

                    <span className="text-slate-500 font-medium ml-2 text-[15px]">

                      ({dashboardTab === 'my_ads' ? (adStatusFilter === 'active' ? activeAds.length : inactiveAds.length) : favoriteAds.length})

                    </span>

                  </h2>

                  <button onClick={() => setCurrentTab('post')} className="text-[13px] font-semibold text-[#65A30D] hover:text-[#84CC16] flex items-center gap-1"><PlusCircle className="w-4 h-4"/> {t.post}</button>

                </div>

                

                {dashboardTab === 'my_ads' && (

                  <div className="flex gap-6 px-5 pt-4 border-b border-slate-100 bg-white">

                    <button onClick={() => setAdStatusFilter('active')} className={`pb-3 text-[14px] font-semibold border-b-2 transition-colors ${adStatusFilter === 'active' ? 'border-[#84CC16] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Activos ({activeAds.length})</button>

                    <button onClick={() => setAdStatusFilter('inactive')} className={`pb-3 text-[14px] font-semibold border-b-2 transition-colors ${adStatusFilter === 'inactive' ? 'border-[#84CC16] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Inactivos ({inactiveAds.length})</button>

                  </div>

                )}



                {displayedAds.length === 0 ? (

                  <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[12px]">

                    {t.noAds}

                  </div>

                ) : (

                  <>

                    {paginatedAds.map((ad) => (

                      <div key={ad.id} className={`p-5 border-b border-slate-100 last:border-0 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-slate-50 transition-colors ${(ad.status === 'inactive' || ad.status === 'paused' || ad.status === 'expired') ? 'opacity-60 grayscale-[0.5]' : ''}`}>

                      <div className="flex gap-4 flex-1 w-full">

                        <img src={getImageUrl(ad.image_url, ad.image)} loading="lazy" className="w-24 h-24 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-200" alt="" />

                        <div className="flex-1 flex flex-col justify-center">

                          <div className="flex items-center gap-2">

                            <h4 className="font-semibold text-slate-900 text-[15px] line-clamp-1">{ad.title}</h4>

                            {ad.status === 'inactive' && <span className="badge bg-slate-200 text-slate-600">Inactivo</span>}

                            {ad.status === 'paused' && <span className="badge bg-amber-100 text-amber-700">Pausado</span>}

                            {ad.status === 'expired' && <span className="badge bg-red-100 text-red-700">Expirado</span>}

                            {ad.status === 'pending' && <span className="badge bg-amber-100 text-amber-700">En revisión</span>}

                            {ad.status === 'rejected' && <span className="badge bg-red-100 text-red-700">Rechazado</span>}

                            {ad.status === 'active' && (() => { const d = getDaysUntilExpiry(ad.expires_at); return d !== null && d <= 15 ? <span className={`badge ${d <= 5 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>Expira en {d}d</span> : null; })()}

                          </div>

                          <p className="text-[#65A30D] text-[16px] font-bold mt-1">${Number(ad.price).toLocaleString()}</p>

                          <div className="flex items-center gap-3 mt-2">

                            <p className="text-[12px] text-slate-500 flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5"/> {ad.views || 0} {t.views}</p>

                            {accountType === 'pro' && <p className="text-[12px] text-slate-500 flex items-center gap-1"><QrCode className="w-3.5 h-3.5"/> {ad.whatsapp_clicks || 0} {t.leads}</p>}

                          </div>

                        </div>

                      </div>

                      <div className="flex w-full sm:w-auto gap-2 mt-2 sm:mt-0 flex-wrap">

                        {ad.user_id === user?.id ? (

                          <>

                          {/* Ver anuncio */}
                          <Link to={`/?ad=${ad.id}`} className="btn-sm flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-1.5 text-xs" title="Ver">
                            <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Ver</span>
                          </Link>

                          {/* Editar — active, paused, rejected */}
                          {(ad.status === 'active' || ad.status === 'paused' || ad.status === 'rejected' || ad.status === 'inactive') && (
                            <Link to={`/anuncio/${ad.id}/editar`} className="btn-sm flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-1.5 text-xs" title="Editar">
                              <Pencil className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Editar</span>
                            </Link>
                          )}

                          {/* Pausar — only if active */}
                          {ad.status === 'active' && (
                            <button onClick={() => handleToggleAdStatus(ad)} className="btn-sm flex-1 sm:flex-none bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center gap-1.5 text-xs" title="Pausar">
                              <Zap className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Pausar</span>
                            </button>
                          )}

                          {/* Reactivar — only if paused */}
                          {ad.status === 'paused' && (
                            <button onClick={() => handleToggleAdStatus(ad)} className="btn-sm flex-1 sm:flex-none bg-lime-50 hover:bg-lime-100 text-[#65A30D] flex items-center justify-center gap-1.5 text-xs" title="Reactivar">
                              <Zap className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Reactivar</span>
                            </button>
                          )}

                          {/* Republicar — only if expired */}
                          {ad.status === 'expired' && (
                            <button onClick={() => handleRepublishAd(ad)} className="btn-sm flex-1 sm:flex-none bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center gap-1.5 text-xs" title={`Republicar (${3 - (ad.republish_count || 0)}/3 gratis)`}>
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Republicar</span>
                              <span className="ml-1 text-[10px] font-bold bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">{3 - (ad.republish_count || 0)}/3</span>
                            </button>
                          )}

                          {/* Promote — active only */}
                          {ad.status === 'active' && (
                            <button onClick={() => handlePromoteAd(ad)} className="btn-sm flex-1 sm:flex-none bg-[#0F172A] hover:bg-black text-white flex items-center justify-center gap-1.5 text-xs shadow-sm">
                              <TrendingUp className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t.promote}</span>
                            </button>
                          )}

                          {/* Eliminar — always */}
                          <button onClick={() => handleDeleteAd(ad.id)} className="btn-sm flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center gap-1.5 text-xs" title={t.delete_ad}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          </>

                        ) : (

                            <button onClick={(e) => handleToggleFavorite(e, ad.id)} className="btn-sm flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center gap-2">

                             <Heart className="w-4 h-4 fill-red-500" /> Quitar

                          </button>

                        )}

                      </div>

                      </div>

                    ))}

                    {totalPages > 1 && (

                      <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50">

                        <span className="text-[13px] text-slate-500 font-medium">

                          Mostrando {(safeDashboardPage - 1) * itemsPerPage + 1} a {Math.min(safeDashboardPage * itemsPerPage, displayedAds.length)} de {displayedAds.length}

                        </span>

                        <div className="flex items-center gap-2">

                          <button 

                            onClick={() => setDashboardPage(Math.max(1, safeDashboardPage - 1))}

                            disabled={safeDashboardPage === 1}

                            className="btn-sm border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white text-slate-700 transition-all"

                          >

                            Anterior

                          </button>

                          <button 

                            onClick={() => setDashboardPage(Math.min(totalPages, safeDashboardPage + 1))}

                            disabled={safeDashboardPage === totalPages}

                            className="btn-sm border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white text-slate-700 transition-all"

                          >

                            Siguiente

                          </button>

                        </div>

                      </div>

                    )}

                  </>

                )}

              </div>



              {accountType === 'particular' && (

                <div className="bg-[#0F172A] rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-lg ring-1 ring-[#0F172A]">

                  <div className="mb-6 md:mb-0 md:mr-8 text-center md:text-left">

                    <h3 className="text-[20px] md:text-[22px] font-bold mb-2 text-white">{t.upgrade_pro}</h3>

                    <p className="text-[14px] text-white/80">{t.upgrade_pro_desc}</p>

                  </div>

                  <button onClick={() => setShowPricingModal(true)} className="btn-md bg-[#84CC16] hover:bg-[#65A30D] text-white whitespace-nowrap w-full md:w-auto text-center shadow-md">

                    {t.tariffs}

                  </button>

                </div>

              )}

            </>

          )}

            </div>

          </div>

        </div>
      {dashToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${dashToast.type === 'error' ? 'bg-red-500' : 'bg-[#25D366]'}`}>
          {dashToast.msg}
        </div>
      )}
    </div>

  );

}
