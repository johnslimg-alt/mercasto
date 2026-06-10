import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import i18n from '../i18n';
import { applyDocumentLanguage, normalizeLanguage } from '../utils/translations';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  // === ТЕМЫ И ЯЗЫК ===
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const [lang, setLang] = useState(() => normalizeLanguage(localStorage.getItem('mercasto_language') || localStorage.getItem('lang') || 'es'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('lang', lang);
    localStorage.setItem('mercasto_language', lang);
    applyDocumentLanguage(lang);
    if (i18n.language !== lang) i18n.changeLanguage(lang);
  }, [lang]);

  // === НАВИГАЦИЯ ===
  const [currentTab, setCurrentTab] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);

  // === МОДАЛЬНЫЕ ОКНА ===
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUserReportModal, setShowUserReportModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // === TOAST УВЕДОМЛЕНИЯ ===
  const [toasts, setToasts] = useState([]);
  
  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const hideToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // === ЗАГРУЗКА ===
  const [loadingStates, setLoadingStates] = useState({});
  
  const setLoading = useCallback((key, value) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);

  const value = {
    // Тема и язык
    isDarkMode,
    setIsDarkMode,
    toggleDarkMode: () => setIsDarkMode(prev => !prev),
    lang,
    setLang,
    
    // Навигация
    currentTab,
    setCurrentTab,
    selectedCategory,
    setSelectedCategory,
    selectedState,
    setSelectedState,
    selectedCity,
    setSelectedCity,
    
    // Модальные окна
    showOnboarding,
    setShowOnboarding,
    showPricingModal,
    setShowPricingModal,
    showQRModal,
    setShowQRModal,
    showReportModal,
    setShowReportModal,
    showUserReportModal,
    setShowUserReportModal,
    showAiModal,
    setShowAiModal,
    showCouponModal,
    setShowCouponModal,
    showProfileModal,
    setShowProfileModal,
    
    // Toast
    toasts,
    showToast,
    hideToast,
    
    // Загрузка
    loadingStates,
    setLoading,
    isLoading: (key) => loadingStates[key] || false
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
}
