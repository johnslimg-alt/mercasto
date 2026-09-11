import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, Bookmark, Car, Home as HomeIcon, Briefcase,
  Wrench, ShoppingBag, Store, Compass, Ticket, Crown, ArrowRight,
  CheckCircle2, ShieldCheck, MessageCircle, Sparkles,
} from 'lucide-react';
import { events } from '../../utils/analytics';
import { formatNumber } from '../../utils/localeFormat';
import { AUTOMOTIVE_PRICE_OPTIONS, AUTOMOTIVE_QUICK_BRANDS, getAutomotiveQuickYears } from '../../utils/automotiveQuickFilters';
import { PopularSearchesSection, CitiesSection, NewsletterSection } from '../home/HomeDiscoverySections';
import FAQSchema from '../seo/FAQSchema';
import ItemListSchema from '../seo/ItemListSchema';
import './HomeScreenV2.css';

const CATEGORY_META = [
  ['motor', '/motor', Car],
  ['inmobiliaria', '/inmuebles', HomeIcon],
  ['empleo', '/empleos', Briefcase],
  ['servicios', '/servicios', Wrench],
  ['productos', '/productos', ShoppingBag],
  ['negocios', '/negocios', Store],
  ['turismo', '/turismo', Compass],
  ['boletos', '/boletos', Ticket],
];

const CATEGORY_LABELS = {
  es: ['Motor','Inmuebles','Empleos','Servicios','Productos','Negocios','Turismo','Boletos'],
  en: ['Motor','Real Estate','Jobs','Services','Products','Business','Tourism','Tickets'],
  pt: ['Motor','Imóveis','Empregos','Serviços','Produtos','Negócios','Turismo','Ingressos'],
  fr: ['Auto','Immobilier','Emplois','Services','Produits','Affaires','Tourisme','Billets'],
  zh: ['汽车','房地产','工作','服务','商品','商务','旅游','门票'],
  ko: ['자동차','부동산','채용','서비스','상품','비즈니스','관광','티켓'],
  de: ['Auto','Immobilien','Jobs','Dienstleistungen','Produkte','Geschäft','Tourismus','Tickets'],
  it: ['Auto','Immobiliare','Lavoro','Servizi','Prodotti','Affari','Turismo','Biglietti'],
  ar: ['سيارات','العقارات','وظائف','خدمات','منتجات','أعمال','سياحة','تذاكر'],
  ru: ['Авто','Недвижимость','Работа','Услуги','Товары','Бизнес','Туризм','Билеты'],
  ja: ['自動車','不動産','求人','サービス','商品','ビジネス','観光','チケット'],
};

function SectionHeader({ title, action, onAction }) {
  return (
    <div className="v2-section-head">
      <h2>{title}</h2>
      {action && (
        <button type="button" onClick={onAction} className="v2-section-link">
          {action}<ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function AdRail({ items, renderAdCard, className = '' }) {
  if (!items?.length) return null;
  return (
    <div className={'v2-ad-rail v2-scroll ' + className}>
      {items.map(ad => (
        <div className="v2-card-shell" key={ad.id}>
          {renderAdCard(ad)}
        </div>
      ))}
    </div>
  );
}

export default function HomeScreenV2({
  activeCat, adsTotal, executeSearch, lang, renderAdCard, serverAds,
  setActiveCat, setCurrentTab, setSearchLocation, setSearchLocationInput, setSearchQuery,
  setSelectedState, setShowPricingModal, searchLocationInput, searchQuery,
  minPrice, maxPrice, setMinPrice, setMaxPrice,
  handleSaveSearchAlert, savingSearchAlert,
  realEstateAds, jobAds, serviceAds, automotiveAds, t,
}) {
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [showAllTrending, setShowAllTrending] = React.useState(false);
  const [featured, setFeatured] = React.useState([]);
  const [homeToast, setHomeToast] = React.useState(null);
  const homeToastTimerRef = React.useRef(null);
  const labels = CATEGORY_LABELS[lang] || CATEGORY_LABELS.es;
  const safeAds = Array.isArray(serverAds) ? serverAds : [];
  const trending = safeAds.slice(0, 12);
  // No fake counters: `safeAds.length` is the size of the loaded page, not the
  // number of ads on the marketplace. The real total comes from the API
  // (`adsTotal`, set from `data.total`) and is shown only when it is known.
  const parsedAdsTotal = Number(adsTotal);
  const realAdsTotal = Number.isFinite(parsedAdsTotal) && parsedAdsTotal > 0 ? parsedAdsTotal : 0;

  React.useEffect(() => {
    let active = true;
    fetch('/api/ads/featured', { headers:{ Accept:'application/json' } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!active) return;
        const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setFeatured(rows.slice(0, 4));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Same feedback contract as the legacy home screen: one transient status
  // message, announced politely, reused by the newsletter and job actions.
  const showHomeToast = React.useCallback((message) => {
    window.clearTimeout(homeToastTimerRef.current);
    setHomeToast(message);
    homeToastTimerRef.current = window.setTimeout(() => setHomeToast(null), 3200);
  }, []);
  React.useEffect(() => () => window.clearTimeout(homeToastTimerRef.current), []);

  const runSearch = React.useCallback((term = '', category = null) => {
    if (category !== null) setActiveCat?.(category);
    setSearchQuery?.(term);
    executeSearch?.(term, null, category ?? undefined);
  }, [executeSearch, setActiveCat, setSearchQuery]);

  const applyCityFilter = React.useCallback((cityName) => {
    setSearchLocationInput?.(cityName);
    setSelectedState?.(cityName);
    executeSearch?.(null, cityName);
    setCurrentTab?.('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [executeSearch, setCurrentTab, setSearchLocationInput, setSelectedState]);

  const onViewAllMexico = React.useCallback(() => {
    setSearchLocation?.(null);
    setSearchLocationInput?.('');
    setSelectedState?.('');
    executeSearch?.(null, '');
  }, [executeSearch, setSearchLocation, setSearchLocationInput, setSelectedState]);

  // Entry point of the publish funnel from the homepage.
  const publishAd = React.useCallback(() => {
    events.publishStep('home_cta', null, { source: 'design_v2_publish' });
    setCurrentTab?.('post');
  }, [setCurrentTab]);

  const automotiveQuickYears = React.useMemo(() => getAutomotiveQuickYears(), []);

  // Automotive quick filters mirror the legacy row one-for-one: a year window
  // and a max-price bucket, both expressed as a search the user can share.
  const applyAutoYear = React.useCallback((year) => {
    if (!year) return;
    executeSearch?.('', null, 'motor', {
      dynamicFilters: { year: { min: year, max: year } },
      source: 'home_auto_year',
    });
  }, [executeSearch]);

  const applyAutoMaxPrice = React.useCallback((maxPrice) => {
    if (!maxPrice) return;
    executeSearch?.('', null, 'motor', { maxPrice, source: 'home_auto_price' });
  }, [executeSearch]);

  const featuredRows = featured.length ? featured : safeAds.slice(0, 4);
  const sectionCopy = {
    all: t.all,
    location: t.location,
    min: t.v2_min_price,
    max: t.v2_max_price,
    reset: t.clear_filters,
    found: t.ads,
    showMore: t.see_all,
    hero: t.heroTitle,
  };

  const submit = (event) => {
    event?.preventDefault();
    executeSearch?.(searchQuery, searchLocationInput, activeCat, {
      minPrice, maxPrice, source:'design_v2',
    });
  };

  const reset = () => {
    setSearchQuery?.('');
    setSearchLocationInput?.('');
    setActiveCat?.('');
    setMinPrice?.('');
    setMaxPrice?.('');
  };

  const openPricing = (source) => {
    events.promotionViewed('pricing', { source });
    setShowPricingModal?.(true);
  };

  const openVertical = (slug, path, source) => {
    events.categorySelected(slug, { source });
    navigate(path);
  };

  return (
    <div className="mercasto-v2" data-testid="home-v2">
      {homeToast && (
        <div className="v2-toast" data-testid="home-toast" role="status" aria-live="polite">
          {homeToast}
        </div>
      )}
      {safeAds.length > 0 && (
        <ItemListSchema
          items={safeAds}
          listName={`${t.featured || 'Mercasto'} · Mercasto`}
          lang={lang}
        />
      )}
      <section className="v2-search-zone">
        <div className="v2-wrap">
          <div className="v2-hero-copy">
            <span className="v2-kicker"><Sparkles size={14} /> Mercasto AI</span>
            <h1>{sectionCopy.hero}</h1>
            {realAdsTotal > 0 && (
              <p>{realAdsTotal.toLocaleString()} {sectionCopy.found}</p>
            )}
          </div>

          <form onSubmit={submit} className="v2-search-form" data-testid="v2-search-form">
            <Search className="v2-search-icon" size={20} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery?.(e.target.value)}
              placeholder={t.search_placeholder}
              aria-label="Mercasto V2 search"
            />
            <button type="button" className={'v2-filter-button ' + (filtersOpen ? 'is-active' : '')}
              onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen} aria-label={t.filter}>
              <SlidersHorizontal size={17} /><span>{t.filter}</span>
            </button>
            <button type="submit" className="v2-search-button" aria-label={t.search_btn}>
              <Search size={16} /><span>{t.search_btn}</span>
            </button>
          </form>

          {filtersOpen && (
            <div className="v2-filter-panel" data-testid="v2-filter-panel">
              <select value={activeCat} onChange={e => setActiveCat?.(e.target.value)} aria-label={sectionCopy.all}>
                <option value="">{sectionCopy.all}</option>
                {CATEGORY_META.map(([slug], i) => <option key={slug} value={slug}>{labels[i]}</option>)}
              </select>
              <input value={searchLocationInput} onChange={e => setSearchLocationInput?.(e.target.value)}
                placeholder={sectionCopy.location} aria-label={sectionCopy.location} />
              <input type="number" min="0" value={minPrice} onChange={e => setMinPrice?.(e.target.value)}
                placeholder={sectionCopy.min} aria-label={sectionCopy.min} />
              <input type="number" min="0" value={maxPrice} onChange={e => setMaxPrice?.(e.target.value)}
                placeholder={sectionCopy.max} aria-label={sectionCopy.max} />
              <button type="button" onClick={reset} className="v2-reset">{sectionCopy.reset}</button>
            </div>
          )}

          <div className="v2-search-actions">
            <button type="button" onClick={() => handleSaveSearchAlert?.()} disabled={savingSearchAlert}>
              <Bookmark size={15} />
              {savingSearchAlert ? '…' : t.save_search}
            </button>
          </div>
        </div>
      </section>

      <section className="v2-categories-zone">
        <div className="v2-wrap">
          <div className="v2-category-rail v2-scroll" data-testid="v2-category-rail">
            {CATEGORY_META.map(([slug,path,Icon], i) => (
              <button type="button" key={slug} onClick={() => openVertical(slug, path, 'design_v2_category_rail')} className="v2-category-pill">
                <span><Icon size={19} /></span>
                <strong>{labels[i]}</strong>
              </button>
            ))}
            <button type="button" onClick={() => openPricing('design_v2_category_rail')} className="v2-category-pill">
              <span><Crown size={19} /></span>
              <strong>{t.pricing}</strong>
            </button>
          </div>
        </div>
      </section>

      <main className="v2-content">
        <div className="v2-wrap">
          <section className="v2-section">
            <SectionHeader title={t.featured_ads}
              action={t.promote_ad}
              onAction={() => openPricing('design_v2_featured')} />
            <AdRail items={featuredRows} renderAdCard={renderAdCard} className="v2-featured-rail" />
          </section>

          <section className="v2-section v2-trending-section">
            <SectionHeader title={t.trending_now}
              action={t.see_all}
              onAction={() => executeSearch?.('', '', '', { source:'design_v2_all' })} />
            <div className={'v2-trending-grid ' + (showAllTrending ? 'is-expanded' : '')}>
              {trending.map(ad => <div className="v2-trend-card" key={ad.id}>{renderAdCard(ad)}</div>)}
            </div>
            {!showAllTrending && trending.length > 8 && (
              <button type="button" className="v2-more" onClick={() => setShowAllTrending(true)}>{sectionCopy.showMore}</button>
            )}
          </section>

          <section className="v2-promo-rail v2-scroll" aria-label="Mercasto promos">
            <button type="button" onClick={() => openVertical('productos', '/productos', 'design_v2_promo')} className="v2-promo v2-promo-orange">
              <small>{t.deal_of_day}</small>
              <strong>{t.elec_phones}</strong>
              <span>{t.shop_now}</span>
            </button>
            <button type="button" onClick={() => openVertical('inmobiliaria', '/inmuebles', 'design_v2_promo')} className="v2-promo v2-promo-teal">
              <small>{t.re_spotlight}</small>
              <strong>{t.buy} · {t.rent}</strong>
              <span>{t.shop_now}</span>
            </button>
            <button type="button" onClick={() => openVertical('motor', '/motor', 'design_v2_promo')} className="v2-promo v2-promo-lime">
              <small>{t.automotive}</small>
              <strong>{t.view_all_mexico}</strong>
              <span>{t.shop_now}</span>
            </button>
          </section>

          <section className="v2-section">
            <SectionHeader title={t.re_spotlight}
              action={t.see_all} onAction={() => navigate('/inmuebles')} />
            <div className="v2-quick-row v2-scroll">
              <button data-testid="home-real-estate-rent" type="button" className="v2-quick"
                onClick={() => runSearch('renta', 'inmobiliaria')}>{t.rent || 'Rentar'}</button>
              <button type="button" className="v2-quick"
                onClick={() => runSearch('venta', 'inmobiliaria')}>{t.buy || 'Comprar'}</button>
              <button type="button" className="v2-quick"
                onClick={() => runSearch('comercial', 'inmobiliaria')}>{t.commercial || 'Comercial'}</button>
            </div>
            <AdRail items={(realEstateAds || []).slice(0,4)} renderAdCard={renderAdCard} />
          </section>

          <section className="v2-section">
            <SectionHeader title={t.jobs_board}
              action={t.see_all} onAction={() => navigate('/empleos')} />
            <AdRail items={(jobAds || []).slice(0,4)} renderAdCard={renderAdCard} />
            <div className="v2-job-actions">
              <button
                data-testid="home-upload-cv"
                type="button"
                onClick={() => showHomeToast(t.upload_cv_available_toast)}
              >
                {t.upload_cv || 'Subir CV'}
              </button>
              <button
                data-testid="home-create-job-alert"
                type="button"
                onClick={() => showHomeToast(t.job_alert_saved_toast)}
              >
                {t.create_job_alert || 'Crear alerta'}
              </button>
            </div>
          </section>

          <section className="v2-section">
            <SectionHeader title={t.services_marketplace}
              action={t.see_all} onAction={() => navigate('/servicios')} />
            <AdRail items={(serviceAds || []).slice(0,4)} renderAdCard={renderAdCard} />
          </section>

          <section className="v2-section">
            <SectionHeader title={t.automotive}
              action={t.see_all} onAction={() => navigate('/motor')} />
            <div className="v2-quick-row v2-scroll" data-testid="home-auto-filter-row">
              <button type="button" className="v2-quick is-active"
                onClick={() => runSearch('', 'motor')}>{t.all || 'Todos'}</button>
              {AUTOMOTIVE_QUICK_BRANDS.map(brand => (
                <button key={brand} type="button" className="v2-quick"
                  onClick={() => runSearch(brand, 'motor')}>{brand}</button>
              ))}
              <select
                data-testid="home-auto-year-filter"
                className="v2-quick-select"
                aria-label={t.year || 'Año'}
                defaultValue=""
                onChange={(event) => applyAutoYear(event.target.value)}
              >
                <option value="">{t.year || 'Año'}</option>
                {automotiveQuickYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
              <select
                data-testid="home-auto-price-filter"
                className="v2-quick-select"
                aria-label={t.price || 'Precio'}
                defaultValue=""
                onChange={(event) => applyAutoMaxPrice(event.target.value)}
              >
                <option value="">{t.price || 'Precio'}</option>
                {AUTOMOTIVE_PRICE_OPTIONS.map(value => (
                  <option key={value} value={value}>≤ ${formatNumber(value, lang)} MXN</option>
                ))}
              </select>
            </div>
            <AdRail items={(automotiveAds || []).slice(0,4)} renderAdCard={renderAdCard} />
          </section>

          <section className="v2-pricing-section">
            <div className="v2-pricing-copy">
              <span className="v2-kicker"><Crown size={14} /> Mercasto Pro</span>
              <h2>{t.pricing_title}</h2>
              <p>{t.pro_desc}</p>
            </div>
            <button type="button" onClick={() => openPricing('design_v2_pricing')} className="v2-pricing-cta">
              {t.view_plans}<ArrowRight size={16}/>
            </button>
          </section>

          <section className="v2-publish">
            <div className="v2-publish-copy">
              <span className="v2-kicker"><Crown size={14} /> {t.for_sellers}</span>
              <h2>{t.boost_ad}</h2>
              <p>{t.boost_desc}</p>
            </div>
            <button type="button" className="v2-publish-cta" onClick={publishAd}>
              {t.promote_now}<ArrowRight size={16} />
            </button>
          </section>

          <section className="v2-how">
            <SectionHeader title={t.how_it_works} />
            <div className="v2-how-grid">
              <article><span><ShoppingBag size={18}/></span><strong>{t.post_60s}</strong><p>{t.post_60s_desc}</p></article>
              <article><span><MessageCircle size={18}/></span><strong>{t.get_leads}</strong><p>{t.get_leads_desc}</p></article>
              <article><span><ShieldCheck size={18}/></span><strong>{t.meet_safely}</strong><p>{t.meet_safely_desc}</p></article>
              <article><span><CheckCircle2 size={18}/></span><strong>{t.safe_payments}</strong><p>{t.safe_payments_desc}</p></article>
            </div>
          </section>

          <PopularSearchesSection t={t} runSearch={runSearch} variant="v2" />
          <CitiesSection
            t={t}
            applyCityFilter={applyCityFilter}
            onViewAllMexico={onViewAllMexico}
            variant="v2"
          />
          <NewsletterSection t={t} showHomeToast={showHomeToast} variant="v2" />

          <FAQSchema pageType="home" lang={lang} variant="v2" />
        </div>
      </main>
    </div>
  );
}
