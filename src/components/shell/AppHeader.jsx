import React, { Suspense } from 'react';
import {
  Bell, Globe, Heart, LogOut, MapPin, MessageCircle, Moon, PlusCircle,
  Search, Settings, Sparkles, Store, Sun, Trash2, User,
} from 'lucide-react';
import { formatDateTime, formatMXN } from '../../utils/localeFormat';
import MercastoLogo from './MercastoLogo';

const SearchSuggestions = React.lazy(() => import('../common/SearchSuggestions'));

export default function AppHeader({
  LANGUAGE_OPTIONS,
  MEXICO_STATES_CITIES,
  activeCat,
  activeSub,
  applyHeaderLocation,
  desktopSearchRef,
  favoriteIds,
  fetchSuggestions,
  getImageUrl,
  getSubcategoryOptions,
  handleDeleteNotification,
  handleHeaderCategoryClick,
  handleLogout,
  handleMarkAllNotificationsRead,
  handleMarkNotificationRead,
  handleSearchInputKeyDown,
  handleSuggestionSelect,
  headerCategories,
  highlightedIndex,
  isAdminRoute,
  isDarkMode,
  isHeaderCategoryActive,
  lang,
  locCity,
  locState,
  mobileSearchInputRef,
  mobileSearchRef,
  navLabels,
  navigate,
  notifications,
  radius,
  recentSearches,
  searchLocation,
  searchLocationInput,
  searchQuery,
  setActiveCat,
  setActiveSub,
  setAuthMode,
  setCurrentTab,
  setDashboardTab,
  setHighlightedIndex,
  setIsDarkMode,
  setLang,
  setLocCity,
  setLocState,
  setRadius,
  setRecentSearches,
  setSearchQuery,
  setShowAuthModal,
  setShowLocationPicker,
  setShowMobileLocationPicker,
  setShowNotifications,
  setShowProfileMenu,
  setShowSuggestions,
  setViewedAd,
  setViewedCompany,
  showLocationPicker,
  showMobileLocationPicker,
  showNotifications,
  showProfileMenu,
  showSuggestions,
  submitHeaderSearch,
  suggestions,
  t,
  unreadCount,
  user,
}) {
  return (
      <header className="site-header sticky top-0 z-40 backdrop-blur-2xl border-b shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6">
          <div data-testid="desktop-header-row" className="desktop-header-row relative flex items-center gap-2 h-[44px] sm:h-[48px] lg:h-[54px]">
            <a href="/" onClick={(e) => { e.preventDefault(); setCurrentTab('home'); setViewedAd(null); setViewedCompany(null); setActiveCat(''); setSearchQuery(''); navigate('/'); }} className="flex items-center gap-2.5 shrink-0 hover:opacity-90 transition-opacity">
              <MercastoLogo className="h-6 sm:h-7 lg:h-9" tagline={t.ai_brand_short} />
            </a>
            <div className={isAdminRoute ? "hidden" : "hidden lg:flex flex-1 items-center"}>
              <div ref={desktopSearchRef} className="relative flex-1 max-w-[860px]">
              <form onSubmit={submitHeaderSearch} data-testid="desktop-header-search" className="desktop-header-control desktop-header-search-control header-search-shell flex w-full items-center rounded-2xl shadow-sm focus-within:ring-4 focus-within:ring-[#84CC16]/20 focus-within:border-[#84CC16] transition-all">
                <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
              <input data-testid="desktop-search-input" aria-label={t.search_placeholder} value={searchQuery} onChange={(e) => { const v = e.target.value; setSearchQuery(v); setViewedAd(null); setViewedCompany(null); fetchSuggestions(v); setShowSuggestions(true); setHighlightedIndex(-1); }} onFocus={() => setShowSuggestions(true)} onKeyDown={handleSearchInputKeyDown} placeholder={t.search_placeholder} className="w-full min-w-0 px-3 py-2 bg-transparent outline-none text-[14px]" />
                {searchLocation?.lat && (
                  <>
                    <div className="h-7 w-px bg-slate-200"></div>
                    <select aria-label={t.filter_global_radius || t.radius} value={radius} onChange={e => setRadius(Number(e.target.value))} className="bg-transparent px-3 py-2.5 text-[13px] outline-none text-slate-700 w-fit cursor-pointer">
                      <option value={5}>+5 km</option>
                      <option value={10}>+10 km</option>
                      <option value={25}>+25 km</option>
                      <option value={50}>+50 km</option>
                      <option value={100}>+100 km</option>
                    </select>
                  </>
                )}
                <button type="submit" data-testid="desktop-search-submit" className="desktop-header-search-submit btn-md bg-[#84CC16] hover:bg-[#65A30D] text-slate-950 m-1 ml-2 flex items-center gap-1.5 rounded-full shadow-sm shadow-[#84CC16]/30">
                  <Search size={16}/>
                  {t.search_btn}
                </button>
              </form>
              <Suspense fallback={null}>
                <SearchSuggestions show={showSuggestions} suggestions={suggestions} query={searchQuery} recentSearches={recentSearches} onSelect={handleSuggestionSelect} onClearRecent={() => { localStorage.removeItem('mercasto_recent_searches'); setRecentSearches([]); }} highlightedIndex={highlightedIndex} />
              </Suspense>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <div className="mobile-top-controls sm:hidden" aria-label={t.theme_language_controls}>
                <button data-testid="mobile-theme-toggle" type="button" onClick={() => setIsDarkMode(v => !v)} className="mobile-theme-icon" aria-label={isDarkMode ? t.light_mode : t.dark_mode} aria-pressed={isDarkMode}>
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <div className="mobile-language-select" aria-label={t.language_switcher}>
                  <Globe className="w-3.5 h-3.5" />
                  <select data-testid="mobile-language-select" aria-label={t.language} value={lang} onChange={(e) => setLang(e.target.value)}>
                    {LANGUAGE_OPTIONS.map(l => (
                      <option key={l} value={l}>{l.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <button type="button" data-testid="mobile-location-button" aria-expanded={showMobileLocationPicker} onClick={() => setShowMobileLocationPicker(!showMobileLocationPicker)} className="mobile-location-select-top" aria-label={t.change_location}>
                    <MapPin className="w-3 h-3 text-[#84CC16]" />
                    <span className="truncate max-w-[45px] text-[10px] font-extrabold uppercase">{searchLocationInput || t.all_mexico}</span>
                  </button>
                  {showMobileLocationPicker && (
                    <div className="header-popover absolute top-full right-0 mt-2 w-[260px] rounded-2xl shadow-xl border p-4 z-50">
                      <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.state}</label>
                      <select data-testid="mobile-location-state" value={locState} onChange={e => { setLocState(e.target.value); setLocCity(''); }} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-[14px] outline-none mb-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                        <option value="">{t.all_mexico}</option>
                        {Object.keys(MEXICO_STATES_CITIES).map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                      <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.city}</label>
                      <select data-testid="mobile-location-city" value={locCity} onChange={e => setLocCity(e.target.value)} disabled={!locState} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-[14px] outline-none mb-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-400">
                        <option value="">{locState ? t.all_cities : t.select_state_first}</option>
                        {locState && MEXICO_STATES_CITIES[locState] ? MEXICO_STATES_CITIES[locState].map(city => <option key={city} value={city}>{city}</option>) : null}
                      </select>
                      <button type="button" data-testid="mobile-location-apply" onClick={() => applyHeaderLocation(true)} className="btn-sm w-full bg-[#84CC16] text-slate-950 py-3">{t.apply}</button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button type="button" data-testid="mobile-account-button" aria-label={user ? t.open_account_menu : t.login} onClick={() => { user ? setShowProfileMenu(v => !v) : (setAuthMode('login'), setShowAuthModal(true)); }} className="mobile-account-button mobile-account-button--top" aria-expanded={showProfileMenu}>
                    {user?.avatar_url ? (
                      <img src={user.avatar_url && (user.avatar_url.startsWith("http") || user.avatar_url.startsWith("data:")) ? user.avatar_url : getImageUrl(user.avatar_url)} className="w-7 h-7 rounded-full object-cover" alt=""/>
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </button>
                  {showProfileMenu && user && (
                    <div className="header-popover profile-menu-popover absolute top-full right-0 mt-2 w-48 rounded-2xl shadow-xl border p-2 z-50">
                      <button onClick={() => { setCurrentTab('profile'); setDashboardTab('my_ads'); setShowProfileMenu(false); }} className="profile-menu-item"><User size={15} /> {t.my_account}</button>
                      <button onClick={() => { setCurrentTab('profile'); setDashboardTab('favorites'); setShowProfileMenu(false); navigate('/profile'); }} className="profile-menu-item"><Heart size={15} /> {t.favorites}</button>
                      <button onClick={() => { setShowProfileMenu(false); navigate('/mensajes'); }} className="profile-menu-item"><MessageCircle size={15} /> {t.messages}</button>
                      <button onClick={() => { setCurrentTab('profile'); setDashboardTab('settings'); setShowProfileMenu(false); }} className="profile-menu-item"><Settings size={15} /> {t.settings}</button>
                      <button onClick={() => { setShowProfileMenu(false); handleLogout(); }} className="profile-menu-item profile-menu-item--danger"><LogOut size={15} /> {t.logout}</button>
                    </div>
                  )}
                </div>
              </div>
              <button data-testid="desktop-theme-toggle" type="button" onClick={() => setIsDarkMode(v => !v)} className="desktop-header-control header-icon-button hidden sm:flex items-center justify-center w-8 h-8 rounded-xl transition-colors mr-1" aria-label={isDarkMode ? t.light_mode : t.dark_mode} aria-pressed={isDarkMode}>
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {/* DESKTOP LOCATION SELECTOR */}
              <div className="relative hidden lg:block">
                <button type="button" data-testid="desktop-location-button" onClick={() => setShowLocationPicker(!showLocationPicker)} className="desktop-header-control header-lang-select hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-bold text-slate-700 dark:text-slate-200 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer mr-1">
                  <MapPin className="w-3.5 h-3.5 text-[#84CC16]" />
                  <span className="truncate max-w-[110px]">{searchLocationInput || t.all_mexico}</span>
                </button>
                {showLocationPicker && (
                  <div className="header-popover absolute top-full right-0 mt-2 w-[260px] rounded-2xl shadow-xl border p-4 z-50 bg-white dark:bg-slate-950">
                    <div className="mb-3">
                      <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.state}</label>
                      <select data-testid="desktop-location-state" value={locState} onChange={e => { setLocState(e.target.value); setLocCity(''); }} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-[13px] outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                        <option value="">{t.all_mexico}</option>
                        {Object.keys(MEXICO_STATES_CITIES).map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-[12px] font-semibold text-slate-700 dark:text-slate-300 mb-1">{t.city}</label>
                      <select data-testid="desktop-location-city" value={locCity} onChange={e => setLocCity(e.target.value)} disabled={!locState} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-[13px] outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-400">
                        <option value="">{locState ? t.all_cities : t.select_state_first}</option>
                        {locState && MEXICO_STATES_CITIES[locState] ? MEXICO_STATES_CITIES[locState].map(city => <option key={city} value={city}>{city}</option>) : null}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" data-testid="desktop-location-cancel" onClick={() => setShowLocationPicker(false)} className="btn-sm flex-1 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">{t.cancel}</button>
                      <button type="button" data-testid="desktop-location-apply" onClick={() => applyHeaderLocation(false)} className="btn-sm flex-1 bg-[#84CC16] text-slate-950 hover:bg-[#65A30D]">{t.apply}</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="desktop-header-control header-lang-select hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <select data-testid="desktop-language-select" aria-label={t.language} value={lang} onChange={(e) => setLang(e.target.value)} className="bg-transparent text-[12px] font-bold outline-none cursor-pointer uppercase appearance-none pr-1">
                  {LANGUAGE_OPTIONS.map(l => (
                    <option key={l} value={l}>{l.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="relative hidden sm:block">
              <button type="button" onClick={() => { user ? navigate('/mensajes') : (setAuthMode('login'), setShowAuthModal(true)); }} className="desktop-header-control header-icon-button relative p-2.5 rounded-xl" aria-label={t.messages}>
                <MessageCircle className="w-[22px] h-[22px]" />
              </button>
              <button type="button" onClick={() => { user ? setShowNotifications(!showNotifications) : (setAuthMode('login'), setShowAuthModal(true)); }} className="desktop-header-control header-icon-button relative p-2.5 rounded-xl" aria-label={t.notifications}>

                  <Bell className="w-[22px] h-[22px]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && user && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white flex justify-between items-center">
                      <span>{t.notifications_title || t.notifications}</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0
                      ? <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-[13px]">{t.notifications_empty_title}</div>
                      : notifications.slice(0, 5).map(n => {
                          let notificationData = null;
                          if (n.type === 'price_drop' && n.data) {
                            try {
                              notificationData = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
                            } catch {
                              notificationData = null;
                            }
                          }

                          return (
                            <div
                              key={n.id}
                              className={`border-b border-slate-50 dark:border-slate-800 relative group ${!n.is_read ? 'bg-[#84CC16]/5 dark:bg-[#84CC16]/10' : ''}`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  handleMarkNotificationRead(n.id);
                                  const dest = notificationData?.ad_url || n.link;
                                  if (dest) { setShowNotifications(false); navigate(dest); }
                                }}
                                className="w-full p-4 pr-10 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              >
                              {notificationData ? (
                                <>
                                  <h4 className={`text-[12px] pr-6 ${!n.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                                    {t.notifications_price_drop_prefix} {notificationData.ad_title}
                                  </h4>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                                    {t.notifications_before} {formatMXN(notificationData.old_price, lang)} → {t.notifications_now} {formatMXN(notificationData.new_price, lang)}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <h4 className={`text-[13px] pr-6 ${!n.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}`}>{n.title}</h4>
                                  <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                                </>
                              )}
                              <span className="text-[10px] text-slate-400 block mt-2">{formatDateTime(n.created_at, lang)}</span>
                              </button>
                              <button type="button" aria-label={t.delete} onClick={(e) => handleDeleteNotification(e, n.id)} className="absolute z-20 top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })
                    }
                    </div>
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <button onClick={() => { setShowNotifications(false); navigate("/notificaciones"); }} className="text-[12px] text-[#65A30D] hover:underline font-medium">{t.notifications_view_all}</button>
                      {notifications.filter(n => !n.is_read).length > 0 && (
                        <button onClick={handleMarkAllNotificationsRead} className="text-[11px] text-slate-500 dark:text-slate-300 hover:underline">{t.notifications_mark_all}</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            <button onClick={() => { navigate('/tiendas'); setViewedAd(null); setViewedCompany(null); }} className="desktop-header-control header-icon-button p-2.5 rounded-xl hidden sm:flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-[#84CC16] transition-colors" title={t.footer_store_directory}>
                <Store className="w-[22px] h-[22px]" />
                <span className="text-[13px] font-bold hidden md:block">{navLabels[5]}</span>
            </button>
            <button onClick={() => { if(user) { setCurrentTab('profile'); setDashboardTab('favorites'); navigate('/profile'); } else { setAuthMode('login'); setShowAuthModal(true); } }} className="desktop-header-control header-icon-button relative p-2.5 rounded-xl hidden sm:block" aria-label={t.favorites || 'Favoritos'}>
                <Heart className="w-[22px] h-[22px]" />
                {favoriteIds.length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[#84CC16] text-slate-950 text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full border-2 border-white">{favoriteIds.length}</span>}
              </button>
            <div className="relative hidden sm:block">
            <button data-testid="desktop-account-button" onClick={() => { if(user) { setShowProfileMenu(v => !v); } else { setAuthMode('login'); setShowAuthModal(true); } setViewedAd(null); setViewedCompany(null); }} className="desktop-header-control header-user-button flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl" aria-expanded={showProfileMenu}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url && (user.avatar_url.startsWith("http") || user.avatar_url.startsWith("data:")) ? user.avatar_url : getImageUrl(user.avatar_url)} className="w-8 h-8 rounded-full object-cover" alt=""/>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><User size={18} /></div>
                )}
              <span className="text-[13px] font-medium hidden lg:block">{user?.name || t.guest || 'Invitado'}</span>
              </button>
              {showProfileMenu && user && (
                <div className="header-popover profile-menu-popover absolute top-full right-0 mt-2 w-52 rounded-2xl shadow-xl border p-2 z-50">
                  <button onClick={() => { setCurrentTab('profile'); setDashboardTab('my_ads'); setShowProfileMenu(false); }} className="profile-menu-item"><User size={15} /> {t.my_account}</button>
                  <button onClick={() => { setCurrentTab('profile'); setDashboardTab('favorites'); setShowProfileMenu(false); }} className="profile-menu-item"><Heart size={15} /> {t.favorites}</button>
                  <button onClick={() => { setShowProfileMenu(false); navigate('/mensajes'); }} className="profile-menu-item"><MessageCircle size={15} /> {t.messages}</button>
                  <button onClick={() => { setCurrentTab('profile'); setDashboardTab('settings'); setShowProfileMenu(false); }} className="profile-menu-item"><Settings size={15} /> {t.settings}</button>
                  <button onClick={() => { setShowProfileMenu(false); handleLogout(); }} className="profile-menu-item profile-menu-item--danger"><LogOut size={15} /> {t.logout}</button>
                </div>
              )}
              </div>
              <button onClick={() => { setCurrentTab('post'); setViewedAd(null); setViewedCompany(null); }} className="desktop-header-control btn-lg bg-[#84CC16] hover:bg-[#65A30D] text-slate-950 shadow-md shadow-[#84CC16]/20 ml-1 hidden sm:inline-flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" /> {t.post_ad || "Publicar"}
              </button>
            </div>
          </div>
          {/* Mobile Search + Location + Account */}
          <div className={isAdminRoute ? "hidden" : "mobile-search-row lg:hidden pt-7 pb-7"}>
            <div ref={mobileSearchRef} className="relative min-w-0">
              <form onSubmit={submitHeaderSearch} data-testid="mobile-header-search" className="mobile-search-box mobile-search-combo flex items-center rounded-full focus-within:ring-2 focus-within:ring-[#84CC16]/30">
                <Search className="w-4 h-4 text-slate-500 shrink-0 ml-3" />
                <input data-testid="mobile-search-input" aria-label={t.search_placeholder_short} ref={mobileSearchInputRef} value={searchQuery} onChange={(e) => { const v = e.target.value; setSearchQuery(v); setViewedAd(null); setViewedCompany(null); fetchSuggestions(v); setShowSuggestions(true); setHighlightedIndex(-1); }} onFocus={() => setShowSuggestions(true)} onKeyDown={handleSearchInputKeyDown} placeholder={t.search_placeholder_short} className="bg-transparent min-w-0 flex-1 px-2 py-2 text-sm outline-none"/>
                <button type="submit" data-testid="mobile-search-submit" aria-label={t.search_btn} className="mobile-search-submit mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#84CC16] text-slate-950">
                  <Search className="h-4 w-4" />
                </button>
              </form>
              <Suspense fallback={null}>
                <SearchSuggestions show={showSuggestions} suggestions={suggestions} query={searchQuery} recentSearches={recentSearches} onSelect={handleSuggestionSelect} onClearRecent={() => { localStorage.removeItem('mercasto_recent_searches'); setRecentSearches([]); }} highlightedIndex={highlightedIndex} />
              </Suspense>
            </div>
            {activeCat && getSubcategoryOptions(activeCat, lang) && (
              <div className="mt-2 w-full">
                <select
                  aria-label={t.all_subcategories}
                  value={activeSub}
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveSub(val);
                    const params = new URLSearchParams(window.location.search);
                    params.set('category', activeCat);
                    if (val) params.set('subcategory', val);
                    else params.delete('subcategory');
                    navigate(`/?${params.toString()}`);
                  }}
                  className="w-full h-[38px] px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[13px] font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-[#84CC16]/30 appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '16px'
                  }}
                >
                  <option value="">{t.all_subcategories}</option>
                  {getSubcategoryOptions(activeCat, lang).map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div data-testid="header-category-bar" className={isAdminRoute ? "hidden" : "header-category-bar border-t"}>
          <div className="max-w-[1440px] mx-auto px-4 lg:px-6">
            <nav className="flex items-center gap-4 overflow-x-auto no-scrollbar font-medium text-slate-600 whitespace-nowrap">
              <button type="button" onClick={() => handleHeaderCategoryClick('')} className={`header-category-link whitespace-nowrap py-2 cursor-pointer border-b-2 transition-colors bg-transparent ${activeCat === '' ? 'is-active font-bold' : 'border-transparent'}`}>{t.all || 'All'}</button>
              {headerCategories.map(c => (
                <button type="button" key={c.slug} onClick={() => handleHeaderCategoryClick(c.slug)} className={`header-category-link whitespace-nowrap py-2 cursor-pointer border-b-2 transition-colors bg-transparent ${isHeaderCategoryActive(c.slug) ? 'is-active font-bold' : 'border-transparent'}`}>{c.label}</button>
              ))}
              {activeCat && getSubcategoryOptions(activeCat, lang) && (
                <div className="relative ml-2 shrink-0 flex items-center">
                  <span className="text-[12px] text-slate-400 mr-2">/</span>
                  <select
                    aria-label={t.all_subcategories}
                    value={activeSub}
                    onChange={(e) => {
                      const val = e.target.value;
                      setActiveSub(val);
                      const params = new URLSearchParams(window.location.search);
                      params.set('category', activeCat);
                      if (val) params.set('subcategory', val);
                      else params.delete('subcategory');
                      navigate(`/?${params.toString()}`);
                    }}
                    className="h-[32px] px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[12px] font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-[#84CC16]/30"
                  >
                    <option value="">{t.all_subcategories}</option>
                    {getSubcategoryOptions(activeCat, lang).map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              )}
            </nav>
          </div>
        </div>
        <div className="border-t border-lime-200/70 bg-lime-50/95 dark:border-lime-500/20 dark:bg-lime-950/40" data-testid="global-ai-brand-strip">
          <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-1.5 px-4 py-1.5 text-center text-[11px] font-extrabold text-lime-900 sm:text-xs dark:text-lime-200">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{t.ai_brand_tagline}</span>
          </div>
        </div>
      </header>
  );
}
