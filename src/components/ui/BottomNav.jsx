import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, Heart, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Bottom Navigation Bar для мобильных устройств
 * Показывается только на экранах < 768px
 * Скрывается на определенных страницах (waitlist, admin, static pages)
 */
const BottomNav = ({ user, setCurrentTab, setDashboardTab, setShowAuthModal, setAuthMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
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
        // Фокус на search input после навигации
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="Buscar"], input[placeholder*="Search"]');
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

  const NavItem = ({ icon: Icon, label, tab, isCenter = false }) => {
    const isActive = activeTab === tab;
    
    if (isCenter) {
      return (
        <button
          onClick={() => handleNavClick(tab)}
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
        onClick={() => handleNavClick(tab)}
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

  return (
    <>
      {/* Spacer для контента чтобы не перекрывался BottomNav */}
      <div className="h-20 md:hidden" aria-hidden="true" />
      
      {/* Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg pb-safe"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around max-w-md mx-auto px-2 py-2">
          <NavItem icon={Home} label={t('home.home', { defaultValue: 'Home' })} tab="home" />
          <NavItem icon={Search} label={t('common.search', { defaultValue: 'Search' })} tab="search" />
          <NavItem icon={PlusCircle} label={t('ads.publish', { defaultValue: 'Publish' })} tab="post" isCenter />
          <NavItem icon={Heart} label={t('ads.favorites', { defaultValue: 'Favorites' })} tab="favorites" />
          <NavItem icon={User} label={t('dashboard.profile', { defaultValue: 'Profile' })} tab="profile" />
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
