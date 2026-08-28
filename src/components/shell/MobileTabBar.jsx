import React from 'react';
import { Bell, Heart, Home, LogOut, Menu, MessageCircle, Plus, PlusCircle, Search, Settings, Sparkles, User } from 'lucide-react';

export default function MobileTabBar({
  currentTab,
  getImageUrl,
  handleLogout,
  location,
  mobileSearchInputRef,
  navigate,
  setActiveCat,
  setAuthMode,
  setCurrentTab,
  setDashboardTab,
  setSearchQuery,
  setShowAuthModal,
  setShowMobileLocationPicker,
  setShowTabBarMenu,
  setViewedAd,
  setViewedCompany,
  showTabBarMenu,
  t,
  unreadCount,
  user,
  viewedAd,
}) {
  return (
    <div className="mobile-tabbar md:hidden fixed bottom-0 w-full border-t pb-safe pt-2 px-6 flex justify-between items-center z-40 h-[84px] shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
      <button aria-label={t.home || 'Inicio'} onClick={() => { setCurrentTab('home'); setViewedAd(null); setViewedCompany(null); setActiveCat(''); setSearchQuery(''); }} className={`flex flex-col items-center p-1 ${currentTab === 'home' && !viewedAd ? 'text-[#84CC16]' : 'text-gray-400 hover:text-[#84CC16]'}`}>
        <Home className="w-6 h-6 mb-1" />
      </button>
      <button aria-label={t.search} onClick={() => { setCurrentTab('home'); setShowMobileLocationPicker(false); window.scrollTo(0,0); window.setTimeout(() => mobileSearchInputRef.current?.focus(), 60); }} className={`flex flex-col items-center p-1 text-gray-400 hover:text-[#84CC16]`}>
        <Search className="w-6 h-6 mb-1" />
      </button>
      <button onClick={() => setCurrentTab('post')} className="flex flex-col items-center p-1 -mt-6 hover:scale-105 transition-transform" aria-label={t.post_ad || 'Publicar anuncio'}>
        <div className="mobile-tabbar-post flex h-14 w-14 items-center justify-center rounded-full border-[4px] border-white bg-[#84CC16] text-[#0F172A] shadow-lg dark:border-slate-900 shadow-[#84CC16]/30">
          <Plus className="w-7 h-7 stroke-[3]" />
        </div>
      </button>
      <button data-testid="mobile-notifications-tab" aria-label={t.notifications} onClick={() => { user ? navigate('/notificaciones') : (setAuthMode('login'), setShowAuthModal(true)); }} className={`flex flex-col items-center p-1 relative ${location.pathname === '/notificaciones' ? 'text-[#84CC16]' : 'text-gray-400 hover:text-[#84CC16]'}`}>
        <Bell className="w-6 h-6 mb-1" />
        {unreadCount > 0 && <span data-testid="mobile-notifications-unread" className="absolute top-0 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
      </button>
      <button onClick={() => setShowTabBarMenu(v => !v)} className={`flex flex-col items-center p-1 ${showTabBarMenu ? 'text-[#84CC16]' : 'text-gray-400 hover:text-[#84CC16]'}`} aria-expanded={showTabBarMenu} aria-label={t.global_menu || 'Menú global'}>
        <Menu className="w-6 h-6 mb-1" />
      </button>
      {showTabBarMenu && (
        <div className="mobile-tabbar-menu fixed bottom-[90px] right-4 w-[280px] rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 z-50 animate-in fade-in slide-in-from-bottom-5">
          {/* User Profile / Guest Header */}
          <div className="mb-3 border-b border-slate-100 pb-3 dark:border-slate-800">
            {user ? (
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <img src={getImageUrl(user.avatar_url)} className="h-10 w-10 rounded-full object-cover border border-slate-200" alt="" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500"><User size={20} /></div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-black text-slate-800 dark:text-white">{user.name}</h4>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white mb-2">{t.menu_welcome}</h4>
                <div className="flex gap-2">
                  <button onClick={() => { setShowTabBarMenu(false); setAuthMode('login'); setShowAuthModal(true); }} className="flex-1 rounded-xl bg-[#84CC16] py-2 text-center text-xs font-bold text-slate-950 hover:bg-[#65A30D]">
                    {t.login_register}
                  </button>
                  <button onClick={() => { setShowTabBarMenu(false); setAuthMode('register'); setShowAuthModal(true); }} className="flex-1 rounded-xl border border-slate-200 py-2 text-center text-xs font-bold text-slate-800 dark:border-slate-700 dark:text-white hover:bg-slate-50">
                    {t.register}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="space-y-1.5">
            {user && (
              <>
                <button onClick={() => { setCurrentTab('profile'); setDashboardTab('my_ads'); setShowTabBarMenu(false); }} className="profile-menu-item flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900">
                  <User size={16} className="text-[#84CC16]" /> {t.my_account}
                </button>
                <button onClick={() => { setCurrentTab('profile'); setDashboardTab('favorites'); setShowTabBarMenu(false); navigate('/profile'); }} className="profile-menu-item flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900">
                  <Heart size={16} className="text-[#84CC16]" /> {t.favorites}
                </button>
                <button onClick={() => { setShowTabBarMenu(false); navigate('/mensajes'); }} className="profile-menu-item flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900">
                  <MessageCircle size={16} className="text-[#84CC16]" /> {t.messages}
                </button>
                <button onClick={() => { setCurrentTab('profile'); setDashboardTab('settings'); setShowTabBarMenu(false); }} className="profile-menu-item flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900">
                  <Settings size={16} className="text-[#84CC16]" /> {t.profile_settings_label}
                </button>
              </>
            )}

            <button onClick={() => { setCurrentTab('post'); setShowTabBarMenu(false); }} className="profile-menu-item flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900">
              <PlusCircle size={16} className="text-[#84CC16]" /> {t.post_ad}
            </button>

            <button onClick={() => { setCurrentTab('help'); setShowTabBarMenu(false); }} className="profile-menu-item flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900">
              <Sparkles size={16} className="text-[#84CC16]" /> {t.help_support}
            </button>
          </div>

          {/* Theme / Settings Footer */}
          {user && (
            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800 flex items-center justify-end">
              <button onClick={() => { setShowTabBarMenu(false); handleLogout(); }} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                <LogOut size={14} /> {t.logout}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
