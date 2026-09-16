import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatNumber } from '../../utils/localeFormat';
import { formatHomePropertiesLabel, getHomeMapCopy } from '../../utils/homeMapCopy';
import { getHomeFaqCopy } from '../../utils/homeFaqCopy';
import { events } from '../../utils/analytics';

const MapV3 = React.lazy(() => import('../common/MapV3'));
const RecommendationsWidget = React.lazy(() => import('../common/RecommendationsWidget'));

const HOME_CATEGORIES = [
  ['motor', { es:'Motor', en:'Motor', pt:'Motor', fr:'Moteur', zh:'机动车', ko:'모터', de:'Motor', it:'Motor', ar:'محرك', ru:'Мотор', ja:'モーター' }],
  ['inmobiliaria', { es:'Inmuebles', en:'Real Estate', pt:'Imóveis', fr:'Immobilier', zh:'房地产', ko:'부동산', de:'Immobilien', it:'Immobiliare', ar:'العقارات', ru:'Недвижимость', ja:'不動産' }],
  ['empleo', { es:'Empleos', en:'Jobs', pt:'Empregos', fr:'Emplois', zh:'工作', ko:'채용', de:'Jobs', it:'Lavoro', ar:'وظائف', ru:'Работа', ja:'求人' }],
  ['servicios', { es:'Servicios', en:'Services', pt:'Serviços', fr:'Services', zh:'服务', ko:'서비스', de:'Dienstleistungen', it:'Servizi', ar:'خدمات', ru:'Услуги', ja:'サービス' }],
  ['productos', { es:'Productos', en:'Goods', pt:'Produtos', fr:'Articles', zh:'商品', ko:'상품', de:'Waren', it:'Prodotti', ar:'سلع', ru:'Товары', ja:'商品' }],
  ['negocios', { es:'Negocios', en:'Business', pt:'Negócios', fr:'Affaires', zh:'商务', ko:'비즈니스', de:'Geschäft', it:'Affari', ar:'أعمال', ru:'Бизнес', ja:'ビジネス' }],
  ['turismo', { es:'Turismo', en:'Tourism', pt:'Turismo', fr:'Tourisme', zh:'旅游', ko:'관광', de:'Tourismus', it:'Turismo', ar:'سياحة', ru:'Туризм', ja:'観光' }],
  ['boletos', { es:'Boletos', en:'Tickets', pt:'Ingressos', fr:'Billets', zh:'门票', ko:'티켓', de:'Tickets', it:'Biglietti', ar:'تذاكر', ru:'Билеты', ja:'チケット' }],
  ['hogar', { es:'Hogar', en:'Home', pt:'Casa', fr:'Maison', zh:'家居', ko:'홈', de:'Haus', it:'Casa', ar:'المنزل', ru:'Дом', ja:'ホーム' }],
  ['mascotas', { es:'Mascotas', en:'Pets', pt:'Pets', fr:'Animaux', zh:'宠物', ko:'반려동물', de:'Haustiere', it:'Animali', ar:'حيوانات أليفة', ru:'Питомцы', ja:'ペット' }],
];

export default function MercastoHomeFunctionalBlocks({
  automotiveAds = [], executeSearch, handleViewAd, lang = 'es', realEstateAds = [],
  selectedState = '', setActiveCat, setSearchLocationInput, setSearchQuery,
  setSelectedState, t = {}, user,
}) {
  const navigate = useNavigate();
  const [homeToast, setHomeToast] = React.useState('');
  const toastTimerRef = React.useRef(null);
  const mapCopy = getHomeMapCopy(lang);
  const faqCopy = getHomeFaqCopy(lang);
  const years = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, index) => String(currentYear - index));
  }, []);

  React.useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  const showHomeToast = React.useCallback((message) => {
    window.clearTimeout(toastTimerRef.current);
    setHomeToast(message || '');
    toastTimerRef.current = window.setTimeout(() => setHomeToast(''), 3200);
  }, []);

  const runSearch = React.useCallback((term = '', category = null, filters = {}) => {
    if (category !== null) setActiveCat?.(category);
    setSearchQuery?.(term);
    executeSearch?.(term, null, category ?? undefined, filters);
  }, [executeSearch, setActiveCat, setSearchQuery]);

  const selectCategory = React.useCallback((slug) => {
    events.categorySelected(slug, { source: 'homepage_category_rail' });
    runSearch('', slug, { source: 'homepage_category_rail' });
  }, [runSearch]);

  const resetMexico = React.useCallback(() => {
    setSearchLocationInput?.('');
    setSelectedState?.('');
    executeSearch?.(null, '');
  }, [executeSearch, setSearchLocationInput, setSelectedState]);

  return (
    <div className="mcg-functional">
      {homeToast && <div className="mcg-toast" data-testid="home-toast" role="status" aria-live="polite">{homeToast}</div>}

      <section className="mcg-functional-section" aria-labelledby="mcg-category-heading">
        <div className="mcg-functional-head">
          <div><h2 id="mcg-category-heading">{t.categories || 'Categorías'}</h2><p>{t.explore_categories || 'Explora todo Mercasto'}</p></div>
          <button type="button" data-testid="home-open-filters" onClick={() => navigate('/listings')}>{t.filter || 'Filtros'}</button>
        </div>
        <div data-testid="home-category-rail" className="mcg-category-rail category-rail rail-fade">
          {HOME_CATEGORIES.map(([slug, labels]) => (
            <button type="button" key={slug} data-testid={'home-category-' + slug} className="category-pill" onClick={() => selectCategory(slug)}>
              <span aria-hidden="true">{slug.slice(0,1).toUpperCase()}</span><b>{labels[lang] || labels.es}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="mcg-functional-section" aria-labelledby="mcg-auto-heading">
        <div className="mcg-functional-head"><div><h2 id="mcg-auto-heading">{t.automotive || 'Motor'}</h2><p>{t.find_vehicle || 'Encuentra tu próximo vehículo'}</p></div><a href="/motor">{t.see_all || 'Ver todos'}</a></div>
        <div data-testid="home-auto-filter-row" className="mcg-auto-filter-row">
          {[['',t.all || 'Todos'],['Nissan','Nissan'],['VW','VW'],['Toyota','Toyota'],['Honda','Honda']].map(([term,label]) => (
            <button type="button" key={label} onClick={() => runSearch(term,'motor',{ source:'home_auto_brand' })}>{label}</button>
          ))}
          <select data-testid="home-auto-year-filter" aria-label={t.year || 'Año'} defaultValue="" onChange={(event) => {
            const year = event.target.value;
            if (year) runSearch('','motor',{ dynamicFilters:{ year:{ min:year,max:year } }, source:'home_auto_year' });
          }}>
            <option value="">{t.year || 'Año'}</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <select data-testid="home-auto-price-filter" aria-label={t.price || 'Precio'} defaultValue="" onChange={(event) => {
            const maxPrice = event.target.value;
            if (maxPrice) runSearch('','motor',{ maxPrice, source:'home_auto_price' });
          }}>
            <option value="">{t.price || 'Precio'}</option>
            {[100000,200000,300000,500000,1000000].map((value) => <option key={value} value={value}>{'≤ $' + formatNumber(value,lang) + ' MXN'}</option>)}
          </select>
        </div>
        {Array.isArray(automotiveAds) && automotiveAds.length > 0 && <div className="mcg-functional-ad-row">
          {automotiveAds.slice(0,4).map((ad) => <button type="button" key={ad.id} onClick={() => handleViewAd?.(ad)}><b>{ad.title}</b><span>{'$' + formatNumber(ad.price || 0,lang) + ' MXN'}</span></button>)}
        </div>}
      </section>

      <section className="mcg-functional-grid">
        <div className="mcg-functional-section mcg-utilities">
          <div className="mcg-functional-head"><div><h2>{t.jobs_board || 'Herramientas rápidas'}</h2><p>{t.home_tools_desc || 'Acciones útiles para comprar y vender'}</p></div></div>
          <div className="mcg-utility-actions">
            <button type="button" data-testid="home-upload-cv" onClick={() => showHomeToast(t.upload_cv_available_toast)}>{t.upload_cv || 'Subir CV'}</button>
            <button type="button" data-testid="home-create-job-alert" onClick={() => showHomeToast(t.job_alert_saved_toast)}>{t.create_job_alert || 'Crear alerta'}</button>
            <button type="button" data-testid="home-real-estate-rent" onClick={() => runSearch('renta','inmobiliaria')}>{t.rent || 'Rentar inmueble'}</button>
          </div>
          <form className="mcg-newsletter" onSubmit={(event) => {
            event.preventDefault(); showHomeToast(t.newsletter_subscribed_toast); event.currentTarget.reset();
          }}>
            <label htmlFor="mcg-newsletter-email">{t.newsletter_title || 'Recibe las mejores ofertas de México'}</label>
            <div><input id="mcg-newsletter-email" type="email" required aria-label={t.your_email || 'Tu correo'} placeholder={t.your_email || 'Tu correo'} /><button data-testid="home-newsletter-submit" type="submit">{t.subscribe || 'Suscribirse'}</button></div>
          </form>
        </div>
        <div className="mcg-functional-section mcg-property-copy">
          <div className="mcg-functional-head"><div><h2>{t.re_spotlight || 'Inmuebles cerca de ti'}</h2>{selectedState&&<p>{formatHomePropertiesLabel(lang,selectedState)}</p>}</div><button type="button" onClick={resetMexico}>{t.view_all_mexico || 'Ver todo México'}</button></div>
          <p className="mcg-map-copy">{mapCopy.propertiesAll}</p>
        </div>
      </section>

      <section className="mcg-functional-section" aria-labelledby="mcg-map-heading">
        <div className="mcg-functional-head"><div><h2 id="mcg-map-heading">{t.map || 'Mapa'}</h2>{selectedState&&<p>{formatHomePropertiesLabel(lang,selectedState)}</p>}</div></div>
        <div data-testid="home-real-estate-map-card" className="mcg-real-map">
          <React.Suspense fallback={<div className="mcg-map-loading">{mapCopy.loading}</div>}>
            <MapV3 ads={Array.isArray(realEstateAds) ? realEstateAds : []} category="inmobiliaria" title={selectedState || t.all_mexico || 'Todo México'} onMarkerClick={handleViewAd} className="mcg-real-map-inner" productLang={lang} showFullscreen />
          </React.Suspense>
        </div>
      </section>

      <section className="mcg-functional-section" aria-labelledby="mcg-recommendations-heading">
        <div className="mcg-functional-head"><div><h2 id="mcg-recommendations-heading">{t.recommendations || 'Recomendaciones para ti'}</h2><p>{t.recommendations_desc || 'Descubre anuncios relevantes'}</p></div></div>
        <React.Suspense fallback={<div className="mcg-recommendations-loading" />}>
          <RecommendationsWidget userId={user?.id} limit={12} onAdClick={handleViewAd} lang={lang} t={t} />
        </React.Suspense>
      </section>

      <section className="mcg-functional-section mcg-faq" aria-labelledby="mcg-faq-heading">
        <div className="mcg-functional-head"><div><h2 id="mcg-faq-heading">{t.faq || 'Preguntas frecuentes'}</h2><p>Mercasto</p></div></div>
        <div className="mcg-faq-grid">{faqCopy.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
      </section>
    </div>
  );
}
