import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MercastoGoldenHeader, { MercastoGoldenBottomNav } from './MercastoGoldenHeader';
import { useUI } from '../../contexts/UIContext';
import { getTranslations } from '../../utils/translations';

export default function GoldenPublicPageShell({ children, testId = 'golden-public-main', className = '', active = 'none' }) {
  const navigate = useNavigate();
  const { lang, isDarkMode, toggleDarkMode, setLang } = useUI();
  const t = getTranslations(lang);

  useEffect(() => {
    document.body.classList.add('mc-golden-shell-active', 'mc-golden-public-active');
    return () => document.body.classList.remove('mc-golden-shell-active', 'mc-golden-public-active');
  }, []);

  const applyLocation = (label, state) => {
    const params = new URLSearchParams();
    if (label) params.set('location', label);
    if (state) params.set('state', state);
    const query = params.toString();
    navigate(query ? `/listings?${query}` : '/listings');
  };
  return (
    <>
      <MercastoGoldenHeader
        publish={() => navigate('/post')}
        onLocationApply={applyLocation}
        onAccount={() => navigate('/profile')}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        lang={lang}
        setLang={setLang}
        locationLabel={t.all_mexico || ''}
        selectedState=""
        t={t}
      />
      <div data-testid={testId} className={`mcg-public-page ${className}`.trim()}>
        {children}
        <MercastoGoldenBottomNav
          active={active}
          publish={() => navigate('/post')}
          onNotifications={() => navigate('/notificaciones')}
          onAccount={() => navigate('/profile')}
          unreadCount={0}
          t={t}
        />
      </div>
    </>
  );
}
