import { Link } from 'react-router-dom';
import PushNotificationManager from '../ui/PushNotificationManager';
import AchievementsModal from '../gamification/AchievementsModal';

import MyAdsScreen from './MyAdsScreen';
import SellerStatsScreen from './SellerStatsScreen';
import { mexicoLocations, subcategoriesMap, mockAds, translations, spotlightRealEstate, jobsBoard, servicesMarketplace, automotiveDeals, recentlyViewed } from '../../constants/mockData';
import React from 'react';
import { Shield, Pencil, PlusCircle, Activity, Heart, MapPin, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Camera, User, BadgeCheck, ShieldCheck, Building2, Zap, Ticket, Crown, Store, UploadCloud, LogOut, Settings, BarChart3, QrCode, Download, Loader2, Settings2, Globe, Sparkles, Play, Video, Phone, AlertTriangle, ArrowRight, ExternalLink, MessageCircle, Share2, Star, Info, HelpCircle, Menu, X, Bell, TrendingUp, CreditCard, TrendingDown, Eye, MousePointer, Calendar, Clock, Award, Target, Package, Bookmark, Filter, MoreVertical, ChevronDown, ChevronUp } from "lucide-react";

const DashboardCharts = React.lazy(() => import('./dashboard/DashboardCharts'));
import SavedSearchesPanel from '../common/SavedSearchesPanel';

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, change, trend, color = 'blue', onClick }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    pink: 'from-pink-500 to-pink-600',
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all cursor-pointer group`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
            trend === 'up' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 
            trend === 'down' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
            'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
          }`}>
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
};

// Tab Button Component
const TabButton = ({ icon: Icon, label, active, onClick, count, color = 'lime' }) => {
  const activeColors = {
    lime: 'text-lime-700 dark:text-lime-400 bg-lime-50 dark:bg-lime-500/10 border-lime-200 dark:border-lime-500/30',
    red: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
    blue: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
    purple: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
        active 
          ? activeColors[color] + ' shadow-sm' 
          : 'text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${active ? '' : 'text-slate-400 dark:text-slate-500'}`} />
        <span className="font-medium text-sm">{label}</span>
      </div>
      {count !== undefined && (
        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
          active 
            ? 'bg-white/50 dark:bg-slate-900/50' 
            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
};

// Trust Score Widget Component
const TrustWidget = ({ trustScore, responseRate, avgResponseTime, accountVerified, hasTrustBadge, t }) => {
  const scoreColor = trustScore > 75 ? 'emerald' : trustScore >= 50 ? 'amber' : 'red';
  const colorMap = {
    emerald: {
      ring: 'stroke-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
      bg: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
      label: t.trust_high || 'High trust',
    },
    amber: {
      ring: 'stroke-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
      bg: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
      label: t.trust_medium || 'Medium trust',
    },
    red: {
      ring: 'stroke-red-500',
      text: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
      bg: 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',
      label: t.trust_low || 'Low trust',
    },
  };
  const c = colorMap[scoreColor];
  // SVG circle gauge params
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * Math.min(trustScore, 100)) / 100;

  return (
    <div className={`bg-gradient-to-br ${c.bg} border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm`}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            {t.trust_response || 'Trust and response'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.seller_trust_metrics || 'Seller trust metrics'}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${c.badge}`}>{c.label}</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Circular Gauge */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Track */}
              <circle
                cx="50" cy="50" r={radius}
                fill="none"
                strokeWidth="10"
                className="stroke-slate-200 dark:stroke-slate-700"
              />
              {/* Progress */}
              <circle
                cx="50" cy="50" r={radius}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className={`${c.ring} transition-all duration-700`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-extrabold leading-none ${c.text}`}>{trustScore}</span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">/ 100</span>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">Trust Score</p>
        </div>

        {/* Metrics Rows */}
        <div className="flex-1 w-full space-y-3">
          {/* Response Rate */}
          <div className="flex items-center justify-between py-3 px-4 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.response_rate || 'Response rate'}</span>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{responseRate}%</span>
          </div>

          {/* Avg Response Time */}
          <div className="flex items-center justify-between py-3 px-4 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.response_time || 'Response time'}</span>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{avgResponseTime}</span>
          </div>

          {/* Verification Status */}
          <div className="flex items-center justify-between py-3 px-4 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                accountVerified ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-slate-100 dark:bg-slate-700'
              }`}>
                {accountVerified
                  ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  : <XCircle className="w-4 h-4 text-slate-400" />}
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.account_verification || 'Account verification'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {accountVerified && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">{t.verified_account || 'Verified'}</span>
              )}
              {hasTrustBadge && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3" /> Pro
                </span>
              )}
              {!accountVerified && !hasTrustBadge && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">{t.pending_status || 'Pending'}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function UserDashboard({ onRefreshAds, accountType, adStatusFilter, analyticsData, analyticsDays, catObj, categoriesData, companyForm, dashboardPage, dashboardTab, emailForm, emailLoading, favoriteAds, fileInputRef, form, getImageUrl, handleBulkUpload, handleClipPayment, handleDeleteAccount, handleDeleteAd, handleEditAd, handleEmailSubmit, handleExportCompanyData, handleLogout, handleNotificationsSubmit, handlePasswordSubmit, handlePromoteAd, handleRepublishAd, handleRenewAd, handleToggleAdStatus, handleToggleFavorite, isDarkMode, isUploadingBulk, lang, notifications, notificationsForm, notificationsLoading, openProfileModal, passwordForm, passwordLoading, renderUserDashboard, searchAlerts = [], loadingSearchAlerts = false, handleToggleSearchAlert, handleDeleteSearchAlert, setAccountType, setAdStatusFilter, setAnalyticsDays, setCompanyForm, setCurrentTab, setDashboardPage, setDashboardTab, setEmailForm, setNotificationsForm, setPasswordForm, setShowCouponModal, setShowPricingModal, setSliderAutoplay, sliderAutoplay, t, user, userAds, userRole, userPayments, loadingUserPayments, userPaymentsPage, userPaymentsLastPage, userPaymentsTotal, loadUserPayments, token }) {
  const [dashToast, setDashToast] = React.useState(null);
  const [showAchievementsModal, setShowAchievementsModal] = React.useState(false);
  const [profileVisible, setProfileVisible] = React.useState(() => localStorage.getItem('mercasto_privacy_profile_visible') !== 'false');
  const [trackingConsent, setTrackingConsent] = React.useState(() => localStorage.getItem('mercasto_privacy_tracking_consent') !== 'false');
  const [reviewStates, setReviewStates] = React.useState({}); // {adId: {rating, comment, submitted, loading}}
  
  const showDashToast = (msg, type = 'success') => {
    setDashToast({ msg, type });
    setTimeout(() => setDashToast(null), 3000);
  };

  const STATUS_LABEL = {
    active: t.active_status || 'Activo',
    draft: t.draft_status || 'Borrador',
    pending: t.pending_status || 'Revisión',
    sold: t.sold_status || 'Vendido',
    inactive: t.inactive_status || 'Inactivo',
    rejected: t.rejected_status || 'Rechazado',
    expired: t.expired_status || 'Expirado',
    paused: t.paused_status || 'Pausado',
  };

  const activeAds   = userAds.filter(ad => ad.status === 'active');
  const draftAds    = userAds.filter(ad => ad.status === 'draft');
  const pendingAds  = userAds.filter(ad => ad.status === 'pending');
  const soldAds     = userAds.filter(ad => ad.status === 'sold');
  const inactiveAds = userAds.filter(ad => ['inactive', 'rejected', 'paused', 'expired'].includes(ad.status));

  const getDisplayedAds = () => {
    if (dashboardTab !== 'my_ads') return favoriteAds;
    switch (adStatusFilter) {
      case 'active':   return activeAds;
      case 'draft':    return draftAds;
      case 'pending':  return pendingAds;
      case 'sold':     return soldAds;
      case 'inactive': return inactiveAds;
      default:         return activeAds;
    }
  };
  const displayedAds = getDisplayedAds();

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
  const totalImpressions = userAds.reduce((sum, ad) => sum + (ad.impressions_count || 0), 0);
  const totalContactClicks = userAds.reduce((sum, ad) => sum + (ad.whatsapp_clicks || 0), 0);

  // Trust metrics
  const avgResponseTime = '< 2 horas';
  const responseRate = userAds.length > 0 ? Math.min(98, 75 + userAds.filter(a => a.whatsapp_clicks > 0).length * 5) : 0;
  
  const conversionRate = (() => {
    if (totalImpressions === 0) return "0.0";
    return ((totalContactClicks / totalImpressions) * 100).toFixed(1);
  })();

  const activePlan = user?.active_plan || {};
  const planLimit = activePlan.monthly_ad_limit || user?.monthly_ad_limit || 3;
  const planExpires = activePlan.expires_at || user?.plan_expires_at;

  const businessName = companyForm?.name?.trim() || user?.company_name || user?.name || t.complete_business_profile || 'Completa tu perfil de empresa';
  const businessSubtitle = companyForm?.website?.trim() || user?.email || t.complete_business_profile_hint || 'Agrega los datos de tu negocio para vender como PRO';
  
  const accountVerified = Boolean(user?.account_verified || user?.email_verified || user?.email_verified_at || user?.phone_verified || user?.is_verified || user?.kyc_status === 'approved');
  const verificationMethods = user?.account_verification_methods || [];
  const hasEmailVerified = Boolean(user?.email_verified || user?.email_verified_at || verificationMethods.includes('email'));
  const hasPhoneVerified = Boolean(user?.phone_verified || verificationMethods.includes('phone'));
  const hasTrustBadge = Boolean(user?.is_verified || verificationMethods.includes('admin') || user?.kyc_status === 'approved');

  const trustScore = Math.min(100, Math.round((responseRate * 0.6) + (accountVerified ? 30 : 10) + (hasTrustBadge ? 10 : 0)));

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
  const safeDashboardPage = Math.min(Math.max(1, dashboardPage || 1), totalPages || 1);

  return (
    <div className="dashboard-dark-scope bg-[var(--paper)] min-h-screen pb-6 md:pb-12 w-full">
      <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto">
        
        {/* Header with Account Type Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {t.dashboard}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t.dashboard_desc || 'Gestiona tus anuncios, estadísticas y configuración'}
            </p>
          </div>
          
          <div className="bg-slate-200 dark:bg-slate-700 p-1 rounded-xl flex items-center w-fit">
            {/* Кнопку "Particular" скрываем для платных/PRO (business) кабинетов — в ней нет смысла */}
            {userRole !== 'business' && (
            <button 
              onClick={() => setAccountType('particular')} 
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                accountType === 'particular' 
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {t.particular}
            </button>
            )}
            <button 
              onClick={() => setAccountType('pro')} 
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                accountType === 'pro' 
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              PRO
            </button>
          </div>
        </div>

        {/* Account Verification Banner */}
        {user && !accountVerified && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="text-amber-600 dark:text-amber-400" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-amber-950 dark:text-amber-100 text-base">{t.unverified_account || 'Cuenta no verificada'}</h3>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  {t.verification_banner_desc || 'Confirma tu email, teléfono o solicita verificación para aumentar la confianza de compradores y vendedores.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {hasEmailVerified ? (
                <span className="btn-sm bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default font-semibold text-xs flex items-center gap-1">
                  <CheckCircle size={14}/> {t.email_verified || 'Email verificado'}
                </span>
              ) : (
                <button 
                  onClick={async () => {
                    try {
                      const tok = localStorage.getItem('auth_token');
                      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api'}/email/send-verification`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${tok}` }
                      });
                      if (r.ok) {
                        showDashToast(t.email_verification_sent || 'Email de verificación enviado.', 'success');
                      } else {
                        showDashToast(t.email_verification_failed || 'No se pudo enviar el email.', 'error');
                      }
                    } catch (err) { 
                      showDashToast(t.connection_error || 'Error de conexión.', 'error'); 
                    }
                  }} 
                  className="btn-sm bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                >
                  {t.verify_email || 'Verificar email'}
                </button>
              )}
              <span className={`btn-sm border cursor-default font-semibold text-xs flex items-center gap-1 ${
                hasPhoneVerified 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-white text-slate-500 border-slate-200'
              }`}>
                {hasPhoneVerified ? <CheckCircle size={14}/> : <Phone size={14}/>} 
                {t.phone || 'Teléfono'} {hasPhoneVerified ? (t.verified || 'verificado') : (t.pending || 'pendiente')}
              </span>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-6 shadow-sm">
          {/* Push Notifications */}
          <div className="mb-6 md:mb-0 md:hidden">
            <PushNotificationManager user={user} compact={false} />
          </div>

          {/* Avatar */}
          <div 
            onClick={openProfileModal} 
            className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-white ${
              accountType === 'pro' ? 'bg-gradient-to-br from-slate-700 to-slate-900' : 'bg-gradient-to-br from-slate-100 to-slate-200'
            } overflow-hidden relative group cursor-pointer shadow-lg`}
          >
            {user?.avatar_url ? (
              <img src={getImageUrl(user.avatar_url)} className="w-full h-full object-cover" alt="User Avatar" />
            ) : (accountType === 'pro' ? <Building2 className="w-10 h-10" /> : <User className="w-10 h-10 text-slate-400" />)}
            
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all rounded-2xl">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              {accountType === 'pro' ? businessName : (user?.name || 'Invitado')}
              {accountType === 'pro' && <span className="badge bg-gradient-to-r from-slate-800 to-slate-900 text-white">PRO</span>}
              {userRole === 'admin' && <span className="badge bg-gradient-to-r from-red-500 to-red-600 text-white">ADMIN</span>}
              {accountVerified ? (
                <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-lg text-xs font-bold border border-emerald-100 dark:border-emerald-500/30">
                  <CheckCircle size={14}/> {t.verified_account || 'Cuenta verificada'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-lg text-xs font-bold border border-amber-100 dark:border-amber-500/30">
                  <XCircle size={14}/> {t.unverified_account || 'Cuenta no verificada'}
                </span>
              )}
              {hasTrustBadge && (
                <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-500/30">
                  <BadgeCheck size={14}/> {t.verified_seller || 'Vendedor verificado'}
                </span>
              )}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {accountType === 'pro' ? businessSubtitle : (user?.email || 'N/A')}
            </p>
            <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl border border-lime-200 dark:border-lime-500/30 bg-lime-50 dark:bg-lime-500/10 px-3 py-2 text-xs font-bold text-lime-800 dark:text-lime-200">
              <Crown size={15}/>
              <span>{activePlan.name || user?.plan_name || (t.free_plan || 'Plan Gratis')}</span>
              <span className="text-lime-700/70 dark:text-lime-200/70">· {planLimit} {t.ads_per_month || 'anuncios/mes'}</span>
              {planExpires && (
                <span className="text-lime-700/70 dark:text-lime-200/70">· {t.expires_word || 'vence'} {new Date(planExpires).toLocaleDateString(lang === 'es' ? 'es-MX' : lang === 'pt' ? 'pt-BR' : lang === 'ru' ? 'ru-RU' : 'en-US')}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 md:ml-auto items-center">
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-800 dark:text-amber-200 px-4 py-3 rounded-xl flex items-center gap-2 font-bold text-sm shadow-sm relative group border border-amber-200 dark:border-amber-800/30">
              <Zap size={18} className="text-amber-500 fill-amber-500"/>
              {parseFloat(user?.balance || 0).toFixed(0)} {t.credits_unit || 'Créditos'}
              <button 
                onClick={() => handleClipPayment(100, `100 ${t.credits_unit || 'Créditos'} Mercasto`, null, 'credits_100')} 
                className="ml-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white w-7 h-7 rounded-lg flex items-center justify-center hover:from-amber-600 hover:to-orange-600 transition-all shadow-md" 
                title={t.credits_btn_title || 'Comprar créditos'}
              >
                +
              </button>
              <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none group-hover:pointer-events-auto">
                <button 
                  onClick={() => setShowCouponModal(true)} 
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5"
                >
                  <Ticket size={14}/> {t.redeem_coupon || 'Canjear cupón'}
                </button>
              </div>
            </div>
            {userRole === 'admin' && (
              <button 
                onClick={() => setCurrentTab('admin')} 
                className="btn-md bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-950 text-white flex items-center justify-center gap-2 shadow-lg"
              >
                <Shield className="w-4 h-4"/> {t.admin_panel}
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        {dashboardTab !== 'settings' && dashboardTab !== 'company' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard 
              icon={Package}
              label={t.active_ads_count || 'Anuncios activos'}
              value={activeAds.length}
              color="blue"
            />
            <StatCard 
              icon={Eye}
              label={t.total_views_count || 'Vistas totales'}
              value={totalViews.toLocaleString()}
              change="+12%"
              trend="up"
              color="green"
            />
            <StatCard 
              icon={MousePointer}
              label={t.contacts || 'Contactos'}
              value={totalContactClicks}
              change="+8%"
              trend="up"
              color="purple"
            />
            <StatCard 
              icon={Target}
              label={t.conversion_rate || 'Tasa conversión'}
              value={`${conversionRate}%`}
              color="orange"
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 space-y-2 sticky top-4">
              <TabButton
                icon={Package}
                label={t.my_ads}
                active={dashboardTab === 'my_ads'}
                onClick={() => setDashboardTab('my_ads')}
                count={userAds.length}
                color="lime"
              />
              <TabButton
                icon={Heart}
                label={t.favorites}
                active={dashboardTab === 'favorites'}
                onClick={() => setDashboardTab('favorites')}
                count={favoriteAds.length}
                color="red"
              />
              <TabButton
                icon={Bell}
                label={t.saved_searches || 'Búsquedas guardadas'}
                active={dashboardTab === 'saved_searches'}
                onClick={() => setDashboardTab('saved_searches')}
                count={searchAlerts.length}
                color="blue"
              />
              {accountType === 'pro' && (
                <TabButton
                  icon={Store}
                  label={t.company_profile}
                  active={dashboardTab === 'company'}
                  onClick={() => setDashboardTab('company')}
                  color="purple"
                />
              )}
              <TabButton
                icon={BarChart3}
                label={t.stats || 'Estadísticas'}
                active={dashboardTab === 'stats'}
                onClick={() => setDashboardTab('stats')}
                color="lime"
              />
              <TabButton
                icon={CreditCard}
                label={t.transactions_tab || 'Transacciones'}
                active={dashboardTab === 'transactions'}
                onClick={() => setDashboardTab('transactions')}
                color="lime"
              />
              <TabButton
                icon={MessageCircle}
                label={t.contact_history || 'Historial de contactos'}
                active={dashboardTab === 'contact_history'}
                onClick={() => setDashboardTab('contact_history')}
                color="lime"
              />
              <TabButton
                icon={Star}
                label={t.pending_reviews || 'Valorar'}
                active={dashboardTab === 'reviews'}
                onClick={() => setDashboardTab('reviews')}
                color="purple"
              />
              <TabButton
                icon={Shield}
                label={t.privacy_settings || 'Privacidad'}
                active={dashboardTab === 'privacy'}
                onClick={() => setDashboardTab('privacy')}
                color="lime"
              />
              <TabButton
                icon={Settings}
                label={t.settings}
                active={dashboardTab === 'settings'}
                onClick={() => setDashboardTab('settings')}
                color="lime"
              />
              
              {/* Achievements Button */}
              <button
                onClick={() => setShowAchievementsModal(true)}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-purple-200 dark:border-purple-500/30 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 text-purple-700 dark:text-purple-400 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5" />
                  <span className="font-medium text-sm">{t.achievements || 'Logros'}</span>
                </div>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {/* Content based on active tab */}
            {dashboardTab === 'my_ads' || dashboardTab === 'favorites' ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                {/* Filter Tabs */}
                {dashboardTab === 'my_ads' && (
                  <div className="flex flex-wrap gap-2 p-4 border-b border-slate-200 dark:border-slate-700">
                    {[
                      { key: 'active',   label: t.active_status  || 'Activos',   count: activeAds.length,   color: 'emerald' },
                      { key: 'draft',    label: t.draft_status   || 'Borrador',  count: draftAds.length,    color: 'slate'   },
                      { key: 'pending',  label: t.pending_status || 'Revisión',  count: pendingAds.length,  color: 'amber'   },
                      { key: 'sold',     label: t.sold_status    || 'Vendido',   count: soldAds.length,     color: 'blue'    },
                      { key: 'inactive', label: t.inactive_status|| 'Inactivos', count: inactiveAds.length, color: 'red'     },
                    ].map(({ key, label, count, color }) => {
                      const colorMap = {
                        emerald: 'bg-emerald-500 text-white shadow-md',
                        slate:   'bg-slate-600 text-white shadow-md',
                        amber:   'bg-amber-500 text-white shadow-md',
                        blue:    'bg-blue-500 text-white shadow-md',
                        red:     'bg-red-500 text-white shadow-md',
                      };
                      return (
                        <button
                          key={key}
                          onClick={() => setAdStatusFilter(key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            adStatusFilter === key
                              ? colorMap[color]
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {label}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            adStatusFilter === key ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Ads List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {displayedAds.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <Package className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mb-4">
                        {dashboardTab === 'my_ads' ? (t.no_ads_yet || 'No tienes anuncios') : (t.no_favorites_yet || 'No tienes favoritos')}
                      </p>
                      {dashboardTab === 'my_ads' && (
                        <button className="btn-md bg-lime-500 hover:bg-lime-600 text-white">
                          <PlusCircle className="w-4 h-4 mr-2" />
                          {t.create_ad_btn || 'Crear anuncio'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {displayedAds
                        .slice((safeDashboardPage - 1) * itemsPerPage, safeDashboardPage * itemsPerPage)
                        .map((ad) => (
                          <div key={ad.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex gap-4">
                              {/* Image */}
                              <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-700">
                                {ad.images?.[0] ? (
                                  <img 
                                    src={getImageUrl(ad.images[0])} 
                                    alt={ad.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-8 h-8 text-slate-400" />
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                                    {ad.title}
                                  </h3>
                                  <span className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ${
                                    ad.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                    ad.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                  }`}>
                                    {STATUS_LABEL[ad.status] || ad.status}
                                  </span>
                                </div>
                                <p className="text-lg font-bold text-lime-600 dark:text-lime-400 mb-2">
                                  ${ad.price?.toLocaleString()}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {ad.views || 0}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MousePointer className="w-3 h-3" />
                                    {ad.whatsapp_clicks || 0}
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col gap-2">
                                <button 
                                  onClick={() => handleEditAd(ad)}
                                  className="btn-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleToggleAdStatus(ad)}
                                  className="btn-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
                                >
                                  {ad.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            {t.showing_pages || 'Mostrando'} {(safeDashboardPage - 1) * itemsPerPage + 1} {t.to_word || 'a'} {Math.min(safeDashboardPage * itemsPerPage, displayedAds.length)} {t.of_word || 'de'} {displayedAds.length}
                          </span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setDashboardPage(Math.max(1, safeDashboardPage - 1))}
                              disabled={safeDashboardPage === 1}
                              className="btn-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all"
                            >
                              {t.prev_btn || 'Anterior'}
                            </button>
                            <button 
                              onClick={() => setDashboardPage(Math.min(totalPages, safeDashboardPage + 1))}
                              disabled={safeDashboardPage === totalPages}
                              className="btn-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all"
                            >
                              {t.next_btn || 'Siguiente'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : dashboardTab === 'saved_searches' ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <SavedSearchesPanel token={token} />
              </div>
            ) : dashboardTab === 'company' ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t.company_profile_section || 'Perfil de empresa'}</h2>
                <p className="text-slate-500 dark:text-slate-400">{t.company_settings_soon || 'Configuración de empresa próximamente...'}</p>
              </div>
            ) : dashboardTab === 'stats' ? (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.stats || 'Estadísticas'}</h2>
                    <select 
                      value={analyticsDays}
                      onChange={(e) => setAnalyticsDays(Number(e.target.value))}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                    >
                      <option value={7}>{t.last_7_days || 'Últimos 7 días'}</option>
                      <option value={30}>{t.last_30_days || 'Últimos 30 días'}</option>
                      <option value={90}>{t.last_90_days || 'Últimos 90 días'}</option>
                    </select>
                  </div>
                  <React.Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-lime-500" /></div>}>
                    <DashboardCharts data={analyticsData} />
                  </React.Suspense>
                </div>

                {/* Trust & Respuesta Widget */}
                <TrustWidget
                  t={t}
                  trustScore={trustScore}
                  responseRate={responseRate}
                  avgResponseTime={avgResponseTime}
                  accountVerified={accountVerified}
                  hasTrustBadge={hasTrustBadge}
                />

                {/* Category Breakdown */}
                {categoryStats.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t.stats_by_category || 'Anuncios por categoría'}</h3>
                    <div className="space-y-3">
                      {categoryStats.map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cat.name}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-lime-500 to-emerald-500 rounded-full"
                                style={{ width: `${(cat.value / userAds.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white w-8 text-right">{cat.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : dashboardTab === 'transactions' ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t.transactions || 'Transacciones'}</h2>
                {loadingUserPayments ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
                  </div>
                ) : userPayments?.length > 0 ? (
                  <div className="space-y-3">
                    {userPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{payment.description}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {new Date(payment.created_at).toLocaleDateString(lang === 'es' ? 'es-MX' : lang === 'pt' ? 'pt-BR' : lang === 'ru' ? 'ru-RU' : 'en-US')}
                          </p>
                        </div>
                        <span className={`font-bold ${payment.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {payment.amount > 0 ? '+' : ''}${payment.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-12">{t.no_transactions_yet || 'No hay transacciones'}</p>
                )}
              </div>
            ) : dashboardTab === 'contact_history' ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                  {t.contact_history || 'Historial de contactos'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Lista de anuncios con los que te has puesto en contacto recientemente en este dispositivo.
                </p>
                {(() => {
                  const contactedRaw = localStorage.getItem('mercasto_contact_history') || '[]';
                  let contacted = [];
                  try { contacted = JSON.parse(contactedRaw); } catch(e) {}
                  
                  if (contacted.length === 0) {
                    return (
                      <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[12px] bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        No has contactado a ningún vendedor todavía.
                      </div>
                    );
                  }
                  
                  return (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {contacted.map((item, idx) => (
                        <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                              {item.image ? (
                                <img src={getImageUrl(item.image)} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400"><Package size={20} /></div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">{item.title}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Contactado vía <span className="font-semibold text-lime-600 dark:text-lime-400 capitalize">{item.channel}</span> · {new Date(item.contactedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Link to={`/?ad=${item.adId}`} className="btn-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            Ver <ExternalLink size={14} />
                          </Link>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : dashboardTab === 'privacy' ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    {t.privacy_settings || 'Privacidad y Seguridad'}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Administra tus datos y preferencias de privacidad en la plataforma.
                  </p>
                </div>
                
                <div className="divide-y divide-slate-100 dark:divide-slate-700 space-y-4">
                  {/* Switch 1: Profile Visibility */}
                  <div className="flex items-center justify-between pt-4">
                    <div className="pr-4">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Perfil público visible</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Permite que otros usuarios vean tus anuncios activos y valoraciones en tu perfil público de vendedor.
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        const newVal = !profileVisible;
                        setProfileVisible(newVal);
                        localStorage.setItem('mercasto_privacy_profile_visible', String(newVal));
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none flex-shrink-0 ${profileVisible ? 'bg-lime-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${profileVisible ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  {/* Switch 2: GDPR / Anonymous Analytics opt-in */}
                  <div className="flex items-center justify-between pt-4">
                    <div className="pr-4">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Análisis y estadísticas anónimas (GDPR)</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Tu dirección IP se cifra (hash SHA-256) antes de procesar cualquier métrica para proteger tu privacidad. Desactiva para excluirte del seguimiento analítico.
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        const newVal = !trackingConsent;
                        setTrackingConsent(newVal);
                        localStorage.setItem('mercasto_privacy_tracking_consent', String(newVal));
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none flex-shrink-0 ${trackingConsent ? 'bg-lime-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${trackingConsent ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  {/* Clear Local Cache */}
                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Limpiar datos locales</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Elimina los anuncios vistos recientemente y el historial de contactos guardado en este dispositivo.
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        if (window.confirm(t.clear_history_confirm || 'Delete search and contacted-listing history from this device?')) {
                          localStorage.removeItem('mercasto_contact_history');
                          localStorage.removeItem('mercasto_recently_viewed');
                          showDashToast('Historial y datos locales eliminados', 'success');
                        }
                      }}
                      className="btn-sm bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 whitespace-nowrap text-xs font-semibold"
                    >
                      Limpiar datos
                    </button>
                  </div>
                </div>
              </div>
            ) : dashboardTab === 'reviews' ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {t.pending_reviews || 'Valorar anuncios contactados'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  {t.pending_reviews_desc || 'Deja tu opinión sobre los anuncios con los que te has puesto en contacto.'}
                </p>
                {(() => {
                  const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';
                  let contacted = [];
                  try { contacted = JSON.parse(localStorage.getItem('mercasto_contact_history') || '[]'); } catch(e) {}

                  if (contacted.length === 0) {
                    return (
                      <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                          <Star className="w-8 h-8 text-purple-400" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400">
                          {t.no_contacts_to_review || 'No has contactado a ningún vendedor todavía. ¡Cuando lo hagas, podrás dejar tu valoración aquí!'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {contacted.map((item) => {
                        const adId = item.adId;
                        const rs = reviewStates[adId] || {};
                        const rating = rs.rating || 0;
                        const comment = rs.comment || '';
                        const submitted = rs.submitted || false;
                        const loading = rs.loading || false;

                        const setRs = (patch) => setReviewStates(prev => ({
                          ...prev,
                          [adId]: { ...(prev[adId] || {}), ...patch }
                        }));

                        const handleSubmit = async () => {
                          if (!rating) return;
                          setRs({ loading: true });
                          try {
                            const tok = localStorage.getItem('auth_token');
                            const sellerId = item.sellerId || adId;
                            const res = await fetch(`${API_URL}/users/${sellerId}/reviews`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(tok ? { 'Authorization': `Bearer ${tok}` } : {})
                              },
                              body: JSON.stringify({ rating, comment, ad_id: adId })
                            });
                            if (res.ok) {
                              setRs({ submitted: true, loading: false });
                            } else {
                              setRs({ loading: false });
                              showDashToast(t.review_error || 'No se pudo enviar la valoración.', 'error');
                            }
                          } catch (e) {
                            setRs({ loading: false });
                            showDashToast(t.connection_error || 'Error de conexión.', 'error');
                          }
                        };

                        return (
                          <div key={adId} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-5 bg-slate-50 dark:bg-slate-900/30 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                              {/* Ad Image */}
                              <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                {item.image ? (
                                  <img src={getImageUrl(item.image)} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <Package size={20} />
                                  </div>
                                )}
                              </div>

                              {/* Info + Rating */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1 mb-0.5">{item.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                  {t.contacted_on || 'Contactado el'} {new Date(item.contactedAt).toLocaleDateString(lang === 'es' ? 'es-MX' : lang === 'pt' ? 'pt-BR' : lang === 'ru' ? 'ru-RU' : 'en-US')}
                                </p>

                                {submitted ? (
                                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                                    <CheckCircle size={16} />
                                    {t.review_sent || 'Valoración enviada ✓'}
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {/* Star Rating */}
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                          key={star}
                                          onClick={() => setRs({ rating: star })}
                                          className="focus:outline-none transition-transform hover:scale-110"
                                          title={`${star} estrella${star > 1 ? 's' : ''}`}
                                          type="button"
                                        >
                                          <Star
                                            size={24}
                                            className={star <= rating
                                              ? 'text-amber-400 fill-amber-400'
                                              : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'
                                            }
                                          />
                                        </button>
                                      ))}
                                      {rating > 0 && (
                                        <span className="ml-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                          {['', t.star_1 || 'Muy malo', t.star_2 || 'Malo', t.star_3 || 'Regular', t.star_4 || 'Bueno', t.star_5 || 'Excelente'][rating]}
                                        </span>
                                      )}
                                    </div>

                                    {/* Comment Textarea — shows when a star is selected */}
                                    {rating > 0 && (
                                      <>
                                        <textarea
                                          value={comment}
                                          onChange={(e) => setRs({ comment: e.target.value })}
                                          placeholder={t.review_comment_placeholder || 'Escribe un comentario opcional...'}
                                          rows={3}
                                          className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                                        />
                                        <button
                                          onClick={handleSubmit}
                                          disabled={loading}
                                          className="btn-sm bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold flex items-center gap-2 disabled:opacity-60"
                                        >
                                          {loading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Star className="w-4 h-4" />
                                          )}
                                          {t.submit_review || 'Enviar valoración'}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : dashboardTab === 'settings' ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t.settings || 'Configuración'}</h2>
                <p className="text-slate-500 dark:text-slate-400">{t.account_settings_soon || 'Configuración de cuenta próximamente...'}</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Upgrade to PRO Banner */}
        {accountType === 'particular' && (
          <div className="mt-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-2xl border border-slate-700">
            <div className="mb-6 md:mb-0 md:mr-8 text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-bold mb-2 text-white">{t.upgrade_pro_btn || 'Actualiza a PRO'}</h3>
              <p className="text-base text-white/80">{t.upgrade_pro_hint || 'Desbloquea todas las funciones y vende más en Mercasto'}</p>
            </div>
            <button 
              onClick={() => setShowPricingModal(true)} 
              className="btn-md bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-white whitespace-nowrap w-full md:w-auto text-center shadow-xl"
            >
              {t.view_plans || 'Ver planes'}
            </button>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {dashToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${
          dashToast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
        }`}>
          {dashToast.msg}
        </div>
      )}

      {/* Achievements Modal */}
      <AchievementsModal isOpen={showAchievementsModal} onClose={() => setShowAchievementsModal(false)} />
    </div>
  );
}
