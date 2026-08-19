import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, Heart, User } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { getTranslations } from '../../utils/translations';

const NavItem = ({ icon: Icon, label, tab, isCenter = false, activeTab, onNavigate }) => {
  const isActive = activeTab === tab;

  if (isCenter) {
    return (
      <button
        onClick={() => onNavigate(tab)}
        className="flex flex-col items-center justify-center relative -mt-6"
        aria-label={label}
      >
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#84CC16] to-[#65A30D] flex items-center justify-center shadow-lg shadow-lime-500/30 hover:shadow-xl hover:shadow-lime-500/40 transition-all hover:scale-110 active:scale-95">
          <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mt-1">{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => onNavigate(tab)}
      className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
        isActive
          ? 'text-[#84CC16]'
          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
      }`}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} fill={isActive ? 'currentColor' : 'none'} />
      <span className={`text-[10px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  );
};

/**
 * Bottom Navigation Bar для мобильных устройств
 * Показывается только на экранах < 768px
 * Скрывается на определенных страницах (waitlist, admin, static pages)
 */
const BottomNav = ({ user, setCurrentTab, setDashboardTab, setShowAuthModal, setAuthMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, loadedLangVersion } = useUI();
  void loadedLangVersion;
  const t = getTranslations(lang);
  const pathname = location.pathname;

  // Страницы где BottomNav НЕ показывается
  const hideOnPaths = [
    '/waitlist',
    '/admin',
    '/terms',
    '/privacy',
    '/help',
    '/safety',
    '/terminos',
    '/privacidad',
    '/cookies',
    '/acerca-de',
    '/contacto',
    '/ayuda',
    '/verificar-email',
    '/referidos',
  ];

  // Скрываем на определенных страницах
  if (hideOnPaths.some(path => pathname.startsWith(path))) {
    return null;
  }

  // Скрываем на страницах редактирования и детальных просмотрах
  if (pathname.includes('/editar') || pathname.startsWith('/anuncio/') || pathname.startsWith('/vendedor/')) {
    return null;
  }

  // Определяем активную вкладку
  const getActiveTab = () => {
    if (pathname === '/') return 'home';
    if (pathname === '/post') return 'post';
    if (pathname === '/profile') return 'profile';
    return null;
  };

  const activeTab = getActiveTab();

  const handleNavClick = (tab) => {
    switch (tab) {
      case 'home':
        navigate('/');
        break;
      case 'search':
        navigate('/');
        // Focus the visible canonical search input after navigation without depending on localized placeholder text.
        setTimeout(() => {
          const searchInputs = Array.from(document.querySelectorAll(
            '[data-testid="mobile-search-input"], [data-testid="desktop-search-input"]'
          ));
          const searchInput = searchInputs.find(input => input.getClientRects().length > 0) || searchInputs[0];
          if (searchInput) {
            searchInput.focus();
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        break;
      case 'post':
        if (user) {
          navigate('/post');
        } else {
          setAuthMode('login');
          setShowAuthModal(true);
        }
        break;
      case 'favorites':
        if (user) {
          setCurrentTab('profile');
          setDashboardTab('favorites');
          navigate('/profile');
        } else {
          setAuthMode('login');
          setShowAuthModal(true);
        }
        break;
      case 'profile':
        if (user) {
          navigate('/profile');
        } else {
          setAuthMode('login');
          setShowAuthModal(true);
        }
        break;
      default:
        break;
    }
  };

  return (
    <>
      {/* Spacer для контента чтобы не перекрывался BottomNav */}
      <div className="h-20 md:hidden" aria-hidden="true" />
      
      {/* Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg pb-safe"
        role="navigation"
        aria-label={t.global_menu}
      >
        <div className="flex items-center justify-around max-w-md mx-auto px-2 py-2">
          <NavItem icon={Home} label={t.home} tab="home" activeTab={activeTab} onNavigate={handleNavClick} />
          <NavItem icon={Search} label={t.search} tab="search" activeTab={activeTab} onNavigate={handleNavClick} />
          <NavItem icon={PlusCircle} label={t.post_ad} tab="post" isCenter activeTab={activeTab} onNavigate={handleNavClick} />
          <NavItem icon={Heart} label={t.favorites} tab="favorites" activeTab={activeTab} onNavigate={handleNavClick} />
          <NavItem icon={User} label={t.profile} tab="profile" activeTab={activeTab} onNavigate={handleNavClick} />
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
