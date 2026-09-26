import React from 'react';
import { useNavigate } from 'react-router-dom';
import './mercasto-golden-home.css';
import { formatMXN } from '../../utils/localeFormat';
import { localizedText } from '../../utils/localize';
import { events } from '../../utils/analytics';
import { useUI } from '../../contexts/UIContext';
import { requestOpenCookiePreferences } from '../../utils/trackingConsent';
import MercastoGoldenHeader, { MercastoGoldenBottomNav } from '../shell/MercastoGoldenHeader';

const P = {
 search:<><circle cx="10.7" cy="10.7" r="6.5"/><path d="m15.6 15.6 4.2 4.2"/></>,
 filter:<><path d="M4 6h16M7 12h10M10 18h4"/><circle cx="8" cy="6" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="12" cy="18" r="1.7"/></>,
 pin:<><path d="M12 21s6.2-5.2 6.2-11A6.2 6.2 0 0 0 5.8 10C5.8 15.8 12 21 12 21Z"/><circle cx="12" cy="10" r="2.2"/></>,
 globe:<><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5S14.3 18.1 12 20.5M12 3.5C9.7 5.9 8.5 8.7 8.5 12s1.2 6.1 3.5 8.5"/></>,
 down:<path d="m7 9 5 5 5-5"/>, right:<path d="m9 6 6 6-6 6"/>,
 menu:<path d="M4 6.5h16M4 12h16M4 17.5h16"/>,
 bell:<><path d="M6.5 17.5h11l-1.3-1.8V11a4.2 4.2 0 0 0-8.4 0v4.7l-1.3 1.8Z"/><path d="M10 19.5a2.2 2.2 0 0 0 4 0"/></>,
 heart:<path d="M12 20.2 5.2 14A5.1 5.1 0 0 1 12 6.4 5.1 5.1 0 0 1 18.8 14L12 20.2Z"/>,
 plus:<path d="M12 5v14M5 12h14"/>,
 home:<><path d="m4 11 8-6.5 8 6.5v8.2a1.3 1.3 0 0 1-1.3 1.3H5.3A1.3 1.3 0 0 1 4 19.2V11Z"/><path d="M9.2 20.5v-6.2h5.6v6.2"/></>,
 grid:<><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></>,
 user:<><circle cx="12" cy="8.2" r="3.4"/><path d="M5.3 20c.8-4.2 3-6.2 6.7-6.2s5.9 2 6.7 6.2"/></>,
 car:<><path d="M4.2 15.8V11l2-4h11.6l2 4v4.8"/><path d="M5.3 11h13.4M6.4 16.2h.1M17.4 16.2h.1"/><path d="M6 15.8v2M18 15.8v2"/></>,
 building:<><path d="M5 20V7.5L12 4v16M12 8h7v12"/><path d="M8 9h1M8 12h1M8 15h1M15 11h1M15 14h1M15 17h1"/></>,
 phone:<><rect x="7.2" y="3.2" width="9.6" height="17.6" rx="2.2"/><path d="M10 6h4M11 18h2"/></>,
 laptop:<><rect x="5" y="5" width="14" height="10" rx="1.4"/><path d="M3.5 18.5h17l-1.7 1.5H5.2l-1.7-1.5Z"/></>,
 sofa:<><path d="M6 11V8.8A2.8 2.8 0 0 1 8.8 6h6.4A2.8 2.8 0 0 1 18 8.8V11"/><path d="M4 11.2A2 2 0 0 1 6 13.2V18h12v-4.8a2 2 0 0 1 4 0V20H2v-6.8a2 2 0 0 1 2-2Z"/></>,
 shirt:<path d="m8 5 4 2 4-2 4 3.5-2.2 3-2.2-1.2V20H8.4v-9.7l-2.2 1.2L4 8.5 8 5Z"/>,
 ball:<><circle cx="12" cy="12" r="8.5"/><path d="m12 8 3 2.1-1.1 3.5h-3.8L9 10.1 12 8ZM6.2 8.8 9 10M15 10l2.8-1.2"/></>,
 paw:<><ellipse cx="12" cy="15.5" rx="4.8" ry="3.7"/><circle cx="6.5" cy="10" r="1.7"/><circle cx="10" cy="7" r="1.7"/><circle cx="14" cy="7" r="1.7"/><circle cx="17.5" cy="10" r="1.7"/></>,
 briefcase:<><rect x="4" y="8" width="16" height="11" rx="2"/><path d="M9 8V5.5h6V8M4 12.5h16"/></>,
 tool:<path d="M14.5 5.2a4.8 4.8 0 0 0-5.8 6.1L4 16l4 4 4.7-4.7a4.8 4.8 0 0 0 6.1-5.8l-3.3 3.3-3-3 3-3.6Z"/>,
 compare:<><path d="M7 5v14M17 5v14M4.5 8 7 5l2.5 3M14.5 16l2.5 3 2.5-3"/><path d="M10 8h7M7 16h7"/></>,
 document:<><path d="M6 3.5h8l4 4V20H6V3.5Z"/><path d="M14 3.5V8h4M9 12h6M9 16h4"/></>,
 users:<><circle cx="9" cy="8.5" r="3"/><circle cx="16.5" cy="9.5" r="2.2"/><path d="M3.8 19c.7-4 2.4-5.8 5.2-5.8 3 0 4.8 1.8 5.5 5.8M14.2 14.1c2.8-.4 4.8 1 5.7 3.9"/></>,
 shield:<><path d="M12 3.5 19 6v5.3c0 4.5-2.5 7.5-7 9.2-4.5-1.7-7-4.7-7-9.2V6l7-2.5Z"/><path d="m8.8 12 2.1 2.1 4.4-4.4"/></>,
 spark:<path d="M12 3.5c.8 4.7 3.4 7.3 8 8-4.6.8-7.2 3.4-8 8-1-4.6-3.6-7.2-8-8 4.5-.8 7.1-3.4 8-8Z"/>,
 chat:<><path d="M5 5.5h14v10.2H9l-4 3v-13.2Z"/><path d="M8 9h8M8 12h5"/></>,
 bot:<><path d="M7 8.5h10a3 3 0 0 1 3 3v5.2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-5.2a3 3 0 0 1 3-3Z"/><path d="M12 5V3M8.5 13h.1M15.5 13h.1M9 16.5h6"/></>,
 more:<><circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/></>
};
function Icon({name,size=22}){return <svg className="mcg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{P[name]||P.spark}</svg>}

const cats=[['Autos','motor','car'],['Inmuebles','inmobiliaria','building'],['Electrónica','electronica','phone'],['Hogar','hogar','sofa'],['Moda','moda','shirt'],['Empleo','empleo','briefcase'],['Servicios','servicios','tool'],['Mascotas','mascotas','paw'],['Deportes','ocio','ball'],['Niños','infantil','users'],['Negocios','negocios','building'],['Más','productos','more']];
const col=[['Vive tu ciudad','/marketing/clasificados-banner-square.png'],['Tecnología','/seller-dashboard-mockup.jpg'],['Hogar con estilo','/og-default-1200x630.jpg'],['Deporte y aventura','/marketing/clasificados-banner-1350.png']];
const cities=[['Ciudad de México','Ciudad de México'],['Guadalajara','Jalisco'],['Monterrey','Nuevo León'],['Puebla','Puebla'],['Mérida','Yucatán'],['Cancún','Quintana Roo'],['Tijuana','Baja California'],['León','Guanajuato']];
const languageCodes=['es','en','pt','fr','zh','ko','de','it','ar','ru','ja'];

function imageFor(ad,getImageUrl){const x=ad&& (ad.image_url||ad.image||ad.thumbnail);if(!x)return '/og-default-1200x630.jpg';try{return getImageUrl?getImageUrl(x):x}catch{return x}}
function realRating(ad){const rawRating=Number(ad?.average_rating ?? ad?.rating);const rawCount=Number(ad?.review_count ?? ad?.reviews_count ?? 0);const hasReviews=Number.isFinite(rawRating)&&rawRating>0&&rawCount>0;return {value:hasReviews?rawRating:0,count:hasReviews?rawCount:0,hasReviews}}
function Ad({ad,lang,getImageUrl,onOpen,compact=false}){if(!ad?.id)return null;const rawPrice=ad?.price;const price=rawPrice===null||rawPrice===undefined?null:Number(rawPrice);const rating=realRating(ad);const title=localizedText(ad?.title,lang)||'Anuncio';const displayPrice=price===null||!Number.isFinite(price)?'Precio no disponible':price===0?'Gratis':formatMXN(price,lang,{minimumFractionDigits:0,maximumFractionDigits:0});return <button aria-label={title} className={'mcg-ad'+(compact?' compact':'')} onClick={()=>onOpen&&onOpen(ad)}><div className="mcg-ad-media"><img src={imageFor(ad,getImageUrl)} alt={title}/><span><Icon name="heart" size={18}/></span></div><div className="mcg-ad-body"><b>{title}</b><strong>{displayPrice}</strong><small><Icon name="pin" size={12}/>{ad?.location||ad?.state||'México'}</small>{rating.hasReviews && <small className="mcg-rating" aria-label={`Calificación ${rating.value.toFixed(1)} de 5, ${rating.count} reseñas`}><Icon name="spark" size={12}/>{rating.value.toFixed(1)} · {rating.count} reseñas</small>}</div></button>}
function EmptyListings({compact=false}){return <div className={'mcg-empty-listings'+(compact?' compact':'')}><Icon name="document"/><b>Aún no hay anuncios para mostrar</b><small>Explora categorías o amplía tu búsqueda.</small></div>}

export default function MercastoGoldenHome({serverAds=[],featuredAds=[],executeSearch,setSearchQuery,setActiveCat,setSearchLocationInput,setSelectedState,setAuthMode,setShowAuthModal,selectedState='',searchLocationInput='',openPricing,handleViewAd,getImageUrl,lang='es',t={},user,unreadCount=0}){
 const nav=useNavigate(); const {isDarkMode,toggleDarkMode,setLang}=useUI(); const [q,setQ]=React.useState(''); const openAi=React.useCallback(()=>{window.dispatchEvent(new CustomEvent('mercasto:open-ai-chat'))},[]);
 const ads=React.useMemo(()=>{const seen=new Set();return [...featuredAds,...serverAds].filter(a=>a?.id&&!seen.has(a.id)&&seen.add(a.id)).slice(0,12)},[featuredAds,serverAds]);
 React.useEffect(()=>{document.body.classList.add('mc-golden-home-active','mc-golden-shell-active');return()=>document.body.classList.remove('mc-golden-home-active','mc-golden-shell-active')},[]);
 React.useEffect(()=>{
  const scrollToCategories=()=>{
   if(window.location.hash!=='#golden-categories')return;
   window.requestAnimationFrame(()=>{
    const target=[...document.querySelectorAll('[data-golden-categories]')].find(node=>node.getClientRects().length>0);
    target?.scrollIntoView({block:'start'});
   });
  };
  scrollToCategories();
  window.addEventListener('hashchange',scrollToCategories);
  return()=>window.removeEventListener('hashchange',scrollToCategories);
 },[]);
 const search=()=>{setSearchQuery&&setSearchQuery(q);executeSearch&&executeSearch(q,null,undefined,{pathname:'/listings',source:'homepage_search'})};
 const searchTerm=term=>{setQ(term);setSearchQuery&&setSearchQuery(term);executeSearch&&executeSearch(term,null,undefined,{pathname:'/listings',source:'homepage_recent_search'})};
 const category=s=>{events.categorySelected(s,{source:'homepage_category_rail'});const routes={motor:'/motor',inmobiliaria:'/inmuebles',electronica:'/electronica',moda:'/moda',hogar:'/hogar',ocio:'/ocio',mascotas:'/mascotas',empleo:'/empleos',servicios:'/servicios',infantil:'/infantil',negocios:'/negocios',productos:'/productos'};nav(routes[s]||'/listings')};
 const publish=()=>nav('/post');
 const city=(label,state)=>{setSearchLocationInput&&setSearchLocationInput(label);setSelectedState&&setSelectedState(state||'');executeSearch&&executeSearch('',label,undefined,{pathname:'/listings',state:state||'',city:label&&label!==state?label:'',source:'homepage_location'})};
 const account=()=>{if(user){nav('/profile');return}setAuthMode?.('login');setShowAuthModal?.(true)};
 const notifications=()=>{if(user){nav('/notificaciones');return}setAuthMode?.('login');setShowAuthModal?.(true)};
 return <div className="mcg-root"><MercastoGoldenHeader
  publish={publish}
  onLocationApply={city}
  onAccount={account}
  accountLabel={user ? (t.my_account || 'Mi cuenta') : (t.login || 'Iniciar sesión')}
  onNotifications={notifications}
  unreadCount={unreadCount}
  accountTextMode
  showPublishCta
  showMobileSearch={false}
  search={{
    value:q,
    onChange:setQ,
    onSubmit:e=>{e.preventDefault();search()},
    showSuggestions:false,
    suggestions:[],
    recentSearches:[],
  }}
  isDarkMode={isDarkMode}
  toggleDarkMode={toggleDarkMode}
  lang={lang}
  setLang={setLang}
  locationLabel={searchLocationInput||selectedState||(t.all_mexico||'Todo México')}
  selectedState={selectedState}
  t={t}
 />
 <h1 className="mcg-responsive-h1"><span className="mcg-h1-desktop">Encuentra lo que necesitas.<br/><em>Vende lo que ya no usas.</em></span><span className="mcg-h1-tablet">Encuentra, compra y vende</span><span className="mcg-h1-mobile">Mercasto AI <small>BETA</small></span></h1>
 <div className="mcg-desktop mcg-reference-desktop">
  <section className="mcg-ref-hero" data-testid="golden-reference-hero">
    <div className="mcg-ref-hero-copy">
      <h1 className="mcg-ref-hero-title">Encuentra lo que necesitas.<br/><em>Vende lo que ya no usas.</em></h1>
      <p>La comunidad de compra y venta en todo México.<br/><b>Fácil, rápido y seguro.</b></p>
      <div className="mcg-ref-popular"><span>Búsquedas populares:</span>{['iPhone','Renta de departamentos','Autos','Empleo','Muebles'].map(term=><button key={term} onClick={()=>searchTerm(term)}>{term}</button>)}</div>
      <div className="mcg-ref-metrics">
        <div><Icon name="users" size={27}/><span><b>Comunidad local</b><small>en todo México</small></span></div>
        <div><Icon name="shield" size={27}/><span><b>Compras seguras</b><small>y confiables</small></span></div>
        <div><Icon name="pin" size={27}/><span><b>Presencia en</b><small>todo México</small></span></div>
      </div>
    </div>
    <div className="mcg-ref-hero-art">
      <img src="/marketing/golden-home-hero-reference.jpg" alt="Persona usando Mercasto junto a su perro"/>
    </div>
  </section>

  <section className="mcg-ref-category-section" data-golden-categories aria-label="Explora por categorías">
    <div className="mcg-ref-section-heading"><h2>Explora por categorías</h2><a href="/listings">Ver todas las categorías <Icon name="right" size={15}/></a></div>
    <div className="mcg-ref-cats">{cats.map(c=><button key={c[0]} onClick={()=>category(c[1])}><span><Icon name={c[2]} size={24}/></span><b>{c[0]}</b></button>)}</div>
  </section>

  <section className="mcg-ref-market-grid">
    <div className="mcg-ref-market-main">
      <div className="mcg-ref-section-heading">
        <div><h2>Anuncios cerca de ti</h2><p>Descubre oportunidades en tu zona</p></div>
        <a href="/listings">Ver más anuncios <Icon name="right" size={15}/></a>
      </div>
      <div className="mcg-ref-near-ads">{ads.length?ads.slice(0,5).map(a=><Ad key={'near-'+a.id} ad={a} lang={lang} getImageUrl={getImageUrl} onOpen={handleViewAd}/>):<EmptyListings/>}</div>

      <div className="mcg-ref-section-heading mcg-ref-offer-heading">
        <div><h2>Ofertas de hoy</h2><p>Ahorra en productos increíbles</p></div>
        <a href="/listings">Ver todas las ofertas <Icon name="right" size={15}/></a>
      </div>
      <div className="mcg-ref-offers">{ads.length?ads.slice(5,10).map(a=><Ad key={'offer-'+a.id} ad={a} lang={lang} getImageUrl={getImageUrl} onOpen={handleViewAd}/>):<EmptyListings/>}</div>
    </div>

    <aside className="mcg-ref-market-aside">
      <div className="mcg-ref-map-panel">
        <div className="mcg-ref-panel-head"><div><h3>Explora anuncios en el mapa</h3><p>Encuentra lo que está cerca de ti</p></div><Icon name="pin" size={22}/></div>
        <button className="mcg-ref-map" onClick={()=>nav('/listings')} aria-label="Explorar anuncios en el mapa">
          <span className="mcg-ref-map-road r1"/><span className="mcg-ref-map-road r2"/><span className="mcg-ref-map-road r3"/>
          <i className="p1"><Icon name="pin" size={19}/></i><i className="p2"><Icon name="pin" size={19}/></i><i className="p3"><Icon name="pin" size={19}/></i><i className="p4"><Icon name="pin" size={19}/></i>
          <b>Ciudad de México</b>
        </button>
        <button className="mcg-ref-map-cta" onClick={()=>nav('/listings')}>Buscar en esta zona</button>
      </div>
      <div className="mcg-ref-seller-card">
        <span>PARA VENDEDORES</span>
        <h3>Vende en Mercasto</h3>
        <p>Publica tu anuncio gratis en minutos y llega a miles de personas en todo México.</p>
        <ul><li>Sin comisión</li><li>Publicación fácil</li><li>Contacto directo</li></ul>
        <button onClick={publish}>Publicar anuncio <Icon name="right" size={16}/></button>
      </div>
    </aside>
  </section>

  <section className="mcg-ref-trust" aria-label="Compra y vende con confianza">
    {[
      ['shield','Personas verificadas','Perfiles más confiables'],
      ['chat','Chat seguro','Comunícate sin compartir datos personales'],
      ['shield','Consejos de seguridad','Recomendaciones para cada paso'],
      ['users','Soporte y ayuda','Estamos para ayudarte'],
      ['heart','Una comunidad real','Personas en todo México'],
    ].map(item=><div key={item[1]}><span><Icon name={item[0]} size={23}/></span><b>{item[1]}</b><small>{item[2]}</small></div>)}
  </section>

  <section className="mcg-ref-duo">
    <div className="mcg-ref-ai-card">
      <div>
        <span className="mcg-ref-kicker"><Icon name="spark" size={15}/>Mercasto AI <small>BETA</small></span>
        <h2>Encuentra justo lo que necesitas, más rápido.</h2>
        <p>Escribe lo que buscas en lenguaje natural y nuestra inteligencia artificial te ayudará a encontrar mejores opciones.</p>
        <button onClick={openAi}>Hablar con Mercasto AI <Icon name="right" size={16}/></button>
      </div>
      <div className="mcg-ref-ai-bot"><Icon name="bot" size={78}/><span>Te entiende</span><span>Encuentra mejores opciones</span><span>Te ahorra tiempo</span></div>
    </div>
    <div className="mcg-ref-app-card">
      <div><span className="mcg-ref-kicker">MERCASTO APP</span><h2>Mercasto en tu bolsillo</h2><p>Publica, compra y vende desde tu celular.</p><b>Próximamente</b></div>
      <div className="mcg-ref-phone"><span>M</span><b>Mercasto</b><small>Compra. Vende. Cerca de ti.</small></div>
    </div>
  </section>

  <section className="mcg-ref-city-section">
    <div className="mcg-ref-section-heading"><h2>Explora por ciudad</h2><a href="/listings">Ver todas las ciudades <Icon name="right" size={15}/></a></div>
    <div className="mcg-ref-cities">{cities.map(([label,state],i)=><button key={label} onClick={()=>city(label,state)} style={{backgroundImage:'linear-gradient(0deg,rgba(0,0,0,.62),rgba(0,0,0,.03)),url("'+col[i%4][1]+'")'}}><b>{label}</b></button>)}</div>
  </section>

  <footer className="mcg-ref-footer">
    <div className="mcg-ref-footer-brand"><a className="mcg-brand" href="/"><span>M</span>Mercasto</a><p>Cosas que conectan personas.</p><div className="mcg-ref-social"><span>◎</span><span>f</span><span>♪</span><span>▶</span><span>𝕏</span></div></div>
    <div><b>Mercasto</b><a href="/sobre-mercasto">Sobre nosotros</a><a href="/blog">Blog</a><a href="/ayuda">Ayuda</a><a href="/contacto">Contacto</a></div>
    <div><b>Ayuda</b><a href="/ayuda">Centro de ayuda</a><a href="/seguridad">Consejos de seguridad</a><a href="/terminos">Términos y condiciones</a><a href="/privacidad">Política de privacidad</a></div>
    <div><b>Para vendedores</b><button onClick={publish}>Publicar anuncio</button><a href="/blog/como-vender-mas-rapido">Tips para vender</a><button onClick={()=>openPricing?.()}>Mercasto Pro</button><button data-testid="golden-cookie-settings" onClick={requestOpenCookiePreferences}>Preferencias de cookies</button></div>
    <div className="mcg-ref-footer-end"><span>🇲🇽 México</span><strong>Dale una<br/>segunda vida<br/>a lo que importa ♡</strong></div>
    <small className="mcg-ref-copyright">© 2026 Mercasto. Todos los derechos reservados.</small>
  </footer>
 </div>
 <DeviceLayouts q={q} setQ={setQ} search={search} searchTerm={searchTerm} category={category} publish={publish} nav={nav} openAi={openAi} ads={ads} lang={lang} getImageUrl={getImageUrl} handleViewAd={handleViewAd} account={account} t={t}/>
 </div>
}
function Section({title,sub,link,children}){return <section className="mcg-section"><div className="mcg-section-head"><div><h2>{title}</h2>{sub&&<p>{sub}</p>}</div>{link&&<a href={link}>Ver todos <Icon name="right" size={15}/></a>}</div>{children}</section>}
function DeviceLayouts({q,setQ,search,searchTerm,category,publish,nav,openAi,ads,lang,getImageUrl,handleViewAd,account,t}){
 const actions=[['search','Buscar productos','Explora anuncios cerca de ti'],['compare','Comparar opciones','Encuentra la mejor opción'],['plus','Crear publicación','Vende fácil y rápido'],['home','Ideas para mi hogar','Consejos e inspiración']];
 return <><div className="mcg-tablet"><div className="mcg-intro"><div className="mcg-tablet-title-spacer" aria-hidden="true"/><p>Un México con más oportunidades para todos</p></div><div className="mcg-dsearch"><div><Icon name="search"/><input data-testid="golden-tablet-search-input" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Qué estás buscando?"/></div><button data-testid="golden-tablet-filter" onClick={()=>nav('/listings')}><Icon name="filter"/>Filtros</button></div><section className="mcg-device-ai"><div className="main"><span>NUEVO</span><h2>Mercasto AI</h2><p>Te ayuda a encontrar justo<br/>lo que necesitas</p><button onClick={()=>openAi?.()}>Probar ahora</button><div className="bigbot"><Icon name="bot" size={88}/></div><div className="bubble">Hola<br/>Soy Mercasto AI<br/>En qué te puedo ayudar hoy?</div></div><div className="chat"><h3>Chat con Mercasto AI</h3><Icon name="bot" size={34}/><p>Obtén recomendaciones,<br/>compara opciones y mucho más</p><button onClick={()=>openAi?.()}>Hablar ahora</button></div></section><div className="mcg-actions">{actions.map((a,i)=><button key={a[1]} onClick={i===2?publish:()=>nav('/listings')}><span><Icon name={a[0]}/></span><b>{a[1]}</b><small>{a[2]}</small></button>)}</div><DeviceCategories category={category}/><div className="mcg-device-section"><Head title="Búsquedas recientes"/><div className="mcg-recents">{['laptop','sofá','iphone','casa en renta','bicicleta'].map(x=><button key={x} onClick={()=>searchTerm(x)}><Icon name="search"/><span><b>{x}</b><small>Ver resultados</small></span><Icon name="right"/></button>)}</div></div><DeviceAds ads={ads} lang={lang} getImageUrl={getImageUrl} handleViewAd={handleViewAd}/></div>
 <div className="mcg-mobile"><div className="mcg-msearch"><div><Icon name="search"/><input data-testid="golden-mobile-search-input" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Buscar en Mercasto..."/></div><button data-testid="golden-mobile-filter" aria-label="Filtros" onClick={()=>nav('/listings')}><Icon name="filter"/></button></div><section className="mcg-mobile-ai"><div className="mcg-mobile-title-spacer" aria-hidden="true"/><h2>Tu asistente inteligente<br/>para <em>comprar, vender</em><br/>y crear publicaciones.</h2><div><Icon name="bot" size={70}/></div></section><section className="mcg-mobile-chat"><Icon name="bot"/><p><b>Mercasto AI</b><br/>Hola! En qué te puedo ayudar hoy?</p><button onClick={()=>openAi?.()}><Icon name="right"/></button></section><div className="mcg-mactions">{actions.slice(0,3).map((a,i)=><button key={a[1]} onClick={i===2?publish:()=>nav('/listings')}><span><Icon name={a[0]}/></span><b>{a[1]}</b><Icon name="right"/></button>)}</div><DeviceCategories category={category}/><DeviceAds ads={ads} lang={lang} getImageUrl={getImageUrl} handleViewAd={handleViewAd}/></div>
 <MercastoGoldenBottomNav active="home" publish={publish} onAccount={account} t={t}/></>
}
function Head({title}){return <div className="mcg-device-head"><h2>{title}</h2><a href="/listings">Ver todas</a></div>}
function DeviceCategories({category}){return <div className="mcg-device-section" data-golden-categories><Head title="Explora por categoría"/><div className="mcg-device-categories">{cats.slice(0,9).map(c=><button key={c[0]} onClick={()=>category(c[1])}><span><Icon name={c[2]}/></span>{c[0]}</button>)}</div></div>}
function DeviceAds({ads,lang,getImageUrl,handleViewAd}){return <div className="mcg-device-section"><Head title="Resultados recomendados para ti"/><div className="mcg-device-ads">{ads.length?ads.slice(0,4).map(a=><Ad key={String(a.id)+'d'} ad={a} lang={lang} getImageUrl={getImageUrl} onOpen={handleViewAd}/>):<EmptyListings/>}</div></div>}
