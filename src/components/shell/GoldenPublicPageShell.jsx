import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MercastoGoldenHeader, { MercastoGoldenBottomNav } from './MercastoGoldenHeader';
import { useUI } from '../../contexts/UIContext';
import { getTranslations } from '../../utils/translations';

export default function GoldenPublicPageShell({
  children,
  testId = 'golden-public-main',
  className = '',
  active = 'none',
  unreadCount = 0,
  locationLabel = '',
  selectedState = '',
  onLocationApply,
  onAccount,
  onNotifications,
  search = null,
}) {
  const navigate = useNavigate();
  const { lang, isDarkMode, toggleDarkMode, setLang } = useUI();
  const t = getTranslations(lang);
  const isVertical = className.split(/\s+/).includes('mcg-vertical-page');

  useEffect(() => {
    document.body.classList.add('mc-golden-shell-active', 'mc-golden-public-active');
    if (isVertical) document.body.classList.add('mc-golden-vertical-active');
    return () => {
      document.body.classList.remove('mc-golden-shell-active', 'mc-golden-public-active');
      if (isVertical) document.body.classList.remove('mc-golden-vertical-active');
    };
  }, [isVertical]);

  const applyLocation = (label, state) => {
    if (onLocationApply) {
      onLocationApply(label, state);
      return;
    }
    const params = new URLSearchParams();
    if (label) params.set('location', label);
    if (state) params.set('state', state);
    const query = params.toString();
    navigate(query ? `/listings?${query}` : '/listings');
  };

  const openAccount = () => {
    if (onAccount) onAccount();
    else navigate('/profile');
  };

  const openNotifications = () => {
    if (onNotifications) onNotifications();
    else navigate('/notificaciones');
  };

  return (
    <>
      <MercastoGoldenHeader
        publish={() => navigate('/post')}
        onLocationApply={applyLocation}
        onAccount={openAccount}
        onNotifications={openNotifications}
        unreadCount={unreadCount}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        lang={lang}
        setLang={setLang}
        locationLabel={locationLabel || t.all_mexico || ''}
        selectedState={selectedState || ''}
        showAiBrand
        search={search}
        t={t}
      />
      <div data-testid={testId} className={`mcg-public-page ${className}`.trim()}>
        {children}
        <MercastoGoldenBottomNav
          active={active}
          publish={() => navigate('/post')}
          onNotifications={openNotifications}
          onAccount={openAccount}
          unreadCount={unreadCount}
          t={t}
        />
      </div>
    </>
  );
}
