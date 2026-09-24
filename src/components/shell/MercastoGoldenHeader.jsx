import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import '../home/mercasto-golden-home.css';
import { MEXICO_STATES_CITIES } from '../../constants/locationData';
import MercastoLogo from './MercastoLogo';

const SearchSuggestions = React.lazy(() => import('../common/SearchSuggestions'));

const icons = {
  pin: <><path d="M12 21s6.2-5.2 6.2-11A6.2 6.2 0 0 0 5.8 10C5.8 15.8 12 21 12 21Z"/><circle cx="12" cy="10" r="2.2"/></>,
  globe: <><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5S14.3 18.1 12 20.5M12 3.5C9.7 5.9 8.5 8.7 8.5 12s1.2 6.1 3.5 8.5"/></>,
  down: <path d="m7 9 5 5 5-5"/>,
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16"/>,
  heart: <path d="M12 20.2 5.2 14A5.1 5.1 0 0 1 12 6.4 5.1 5.1 0 0 1 18.8 14L12 20.2Z"/>,
  chat: <><path d="M5 5.5h14v10.2H9l-4 3v-13.2Z"/><path d="M8 9h8M8 12h5"/></>,
  home: <><path d="m4 11 8-6.5 8 6.5v8.2a1.3 1.3 0 0 1-1.3 1.3H5.3A1.3 1.3 0 0 1 4 19.2V11Z"/><path d="M9.2 20.5v-6.2h5.6v6.2"/></>,
  search: <><circle cx="10.7" cy="10.7" r="6.5"/><path d="m15.6 15.6 4.2 4.2"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  bell: <><path d="M6.5 17.5h11l-1.3-1.8V11a4.2 4.2 0 0 0-8.4 0v4.7l-1.3 1.8Z"/><path d="M10 19.5a2.2 2.2 0 0 0 4 0"/></>,
  user: <><circle cx="12" cy="8.2" r="3.4"/><path d="M5.3 20c.8-4.2 3-6.2 6.7-6.2s5.9 2 6.7 6.2"/></>,
};

function Icon({ name, size = 22 }) {
  return <svg className="mcg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

const languageCodes = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];

export default function MercastoGoldenHeader({
  publish,
  onLocationApply,
  onAccount,
  accountLabel,
  accountTextMode = false,
  showPublishCta = false,
  onNotifications,
  unreadCount = 0,
  showAiBrand = false,
  search = null,
  showMobileSearch = true,
  isDarkMode,
  toggleDarkMode,
  lang,
  setLang,
  locationLabel,
  selectedState = '',
  t = {},
}) {
  const [locationOpen, setLocationOpen] = React.useState(false);
  const [state, setState] = React.useState(selectedState || '');
  const [city, setCity] = React.useState('');

  React.useEffect(() => setState(selectedState || ''), [selectedState]);

  const applyLocation = () => {
    onLocationApply?.(city || state || '', state || '');
    setLocationOpen(false);
  };
  const locationAria = `${t.change_location || ''}: ${locationLabel}`;

  return (
    <>
    <header className={`mcg-header ${search ? 'mcg-header-with-search' : ''}`} data-testid="golden-header">
      <Link to="/" className="mcg-brand header-logo-link">
        {showAiBrand ? <MercastoLogo className="h-9" tagline={t.ai_brand_short || ''} /> : <><span>M</span>Mercasto</>}
      </Link>
      <div className="mcg-location-wrap">
        <button
          className="mcg-location"
          data-testid="golden-location-button"
          onClick={() => setLocationOpen(value => !value)}
          aria-label={locationAria}
          aria-expanded={locationOpen}
        >
          <Icon name="pin" size={15}/>
          <span>{locationLabel}</span>
          <Icon name="down" size={14}/>
        </button>
        {locationOpen && (
          <div className="mcg-location-popover" role="dialog" aria-label={t.change_location || ''}>
            <label>
              {t.state || ''}
              <select data-testid="golden-location-state" value={state} onChange={event => { setState(event.target.value); setCity(''); }}>
                <option value="">{t.all_mexico || ''}</option>
                {Object.keys(MEXICO_STATES_CITIES).map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label>
              {t.city || ''}
              <select data-testid="golden-location-city" value={city} disabled={!state} onChange={event => setCity(event.target.value)}>
                <option value="">{state ? (t.all_cities || '') : (t.select_state_first || '')}</option>
                {state && (MEXICO_STATES_CITIES[state] || []).map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <button type="button" data-testid="golden-location-apply" onClick={applyLocation}>{t.apply || ''}</button>
          </div>
        )}
      </div>
      {search && (
        <div data-testid="desktop-header-row" className="mcg-public-search-desktop">
          <div className="mcg-public-search-wrap">
            <form data-testid="desktop-header-search" onSubmit={search.onSubmit} className="mcg-public-search-form">
              <Icon name="search" size={17}/>
              <input
                data-testid="golden-desktop-search-input"
                aria-label={t.search_placeholder || ''}
                value={search.value || ''}
                onChange={event => search.onChange?.(event.target.value)}
                onFocus={search.onFocus}
                onKeyDown={search.onKeyDown}
                placeholder={t.search_placeholder || ''}
              />
              <button type="submit" data-testid="golden-desktop-search-submit">{t.search_btn || ''}</button>
            </form>
            <Suspense fallback={null}>
              <SearchSuggestions show={search.showSuggestions} suggestions={search.suggestions} query={search.value || ''} recentSearches={search.recentSearches} onSelect={search.onSelect} onClearRecent={search.onClearRecent} highlightedIndex={search.highlightedIndex} />
            </Suspense>
          </div>
        </div>
      )}
      <nav>
        <Link to="/listings">{t.buy || ''}</Link>
        <button onClick={publish}>{t.sell_fast || ''}</button>
        <Link to="/listings">{t.categories || ''}</Link>
        <Link to="/listings">{t.map || ''}</Link>
        <Link to="/sobre-mercasto">{t.footer_about || ''}</Link>
        <Link to="/ayuda">{t.help || ''}</Link>
      </nav>
      <label className="mcg-lang" aria-label={t.language || ''}>
        <Icon name="globe" size={16}/>
        <select data-testid="golden-language-select" value={lang} onChange={event => setLang(event.target.value)} aria-label={t.language || 'Idioma'}>
          {languageCodes.map(code => <option key={code} value={code}>{code.toUpperCase()}</option>)}
        </select>
      </label>
      <button
        data-testid="golden-theme-toggle"
        className={'mcg-theme ' + (isDarkMode ? 'dark' : '')}
        onClick={toggleDarkMode}
        aria-label={isDarkMode ? (t.light_mode || '') : (t.dark_mode || '')}
        aria-pressed={isDarkMode}
      ><span/></button>
      <Link to="/profile?tab=favorites" className="mcg-hicon" aria-label={t.favorites || ''}><Icon name="heart"/></Link>
      <Link to="/mensajes" className="mcg-hicon" aria-label={t.messages || ''}><Icon name="chat"/></Link>
      {onNotifications ? (
        <button type="button" data-testid="golden-notifications-link" className="mcg-hicon mcg-notification-button" aria-label={t.notifications || ''} onClick={onNotifications}>
          <Icon name="bell"/>
          {unreadCount > 0 && <i data-testid="golden-notifications-unread" className="mcg-unread-dot mcg-unread-dot--header" aria-hidden="true"/>}
        </button>
      ) : (
        <Link to="/notificaciones" data-testid="golden-notifications-link" className="mcg-hicon" aria-label={t.notifications || ''}>
          <Icon name="bell"/>
          {unreadCount > 0 && <i data-testid="golden-notifications-unread" className="mcg-unread-dot mcg-unread-dot--header" aria-hidden="true"/>}
        </Link>
      )}
      <button type="button" data-testid="golden-account-button" className={accountTextMode ? 'mcg-account-text' : 'mcg-hicon'} aria-label={accountLabel || t.my_account || t.open_account_menu || t.login || ''} onClick={onAccount}>
        {accountTextMode ? <><Icon name="user" size={17}/><span>{accountLabel || t.login || 'Iniciar sesión'}</span></> : <Icon name="menu"/>}
      </button>
      {showPublishCta && <button type="button" className="mcg-publish-cta" data-testid="golden-header-publish" onClick={publish}><Icon name="plus" size={18}/><span>{t.publish_btn || 'Publicar anuncio'}</span></button>}
    </header>
    {search && showMobileSearch && (
      <div className="mcg-public-search-mobile-row">
        <div className="mcg-public-search-wrap">
          <form data-testid="mobile-header-search" onSubmit={search.onSubmit} className="mcg-public-search-form">
            <Icon name="search" size={17}/>
            <input
              data-testid="golden-mobile-search-input"
              aria-label={t.search_placeholder_short || t.search_placeholder || ''}
              value={search.value || ''}
              onChange={event => search.onChange?.(event.target.value)}
              onFocus={search.onFocus}
              onKeyDown={search.onKeyDown}
              placeholder={t.search_placeholder_short || t.search_placeholder || ''}
            />
            <button type="submit" data-testid="golden-mobile-search-submit" aria-label={t.search_btn || ''}><Icon name="search" size={16}/></button>
          </form>
          <Suspense fallback={null}>
            <SearchSuggestions show={search.showSuggestions} suggestions={search.suggestions} query={search.value || ''} recentSearches={search.recentSearches} onSelect={search.onSelect} onClearRecent={search.onClearRecent} highlightedIndex={search.highlightedIndex} />
          </Suspense>
        </div>
      </div>
    )}
    </>
  );
}


export function MercastoGoldenBottomNav({
  active = 'home',
  publish,
  onNotifications,
  onAccount,
  unreadCount = 0,
  t = {},
}) {
  return (
    <nav className="mcg-bottom-nav" data-testid="golden-bottom-nav">
      <Link to="/" className={active === 'home' ? 'active' : ''}><Icon name="home"/><span>{t.home || ''}</span></Link>
      <Link to="/listings" className={active === 'search' ? 'active' : ''}><Icon name="search"/><span>{t.search_btn || ''}</span></Link>
      <button type="button" onClick={publish} className="publish"><i><Icon name="plus"/></i><b>{t.publish_btn || ''}</b></button>
      <button type="button" data-testid="golden-mobile-notifications-tab" className={`mcg-bottom-action ${active === 'notifications' ? 'active' : ''}`} aria-label={t.notifications || ''} onClick={onNotifications}>
        <Icon name="bell"/><span>{t.notifications || ''}</span>
        {unreadCount > 0 && <i data-testid="golden-mobile-notifications-unread" className="mcg-unread-dot" aria-hidden="true"/>}
      </button>
      <button type="button" data-testid="golden-mobile-account-tab" className={`mcg-bottom-action ${active === 'account' ? 'active' : ''}`} onClick={onAccount}>
        <Icon name="user"/><span>{t.my_account || ''}</span>
      </button>
    </nav>
  );
}
