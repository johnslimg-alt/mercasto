import React from 'react';
import { useNavigate } from 'react-router-dom';
import './mercasto-golden-home.css';

const P = {
 search:<><circle cx="10.7" cy="10.7" r="6.5"/><path d="m15.6 15.6 4.2 4.2"/></>,
 filter:<><path d="M4 6h16M7 12h10M10 18h4"/><circle cx="8" cy="6" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="12" cy="18" r="1.7"/></>,
 pin:<><path d="M12 21s6.2-5.2 6.2-11A6.2 6.2 0 0 0 5.8 10C5.8 15.8 12 21 12 21Z"/><circle cx="12" cy="10" r="2.2"/></>,
 globe:<><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5S14.3 18.1 12 20.5M12 3.5C9.7 5.9 8.5 8.7 8.5 12s1.2 6.1 3.5 8.5"/></>,
 down:<path d="m7 9 5 5 5-5"/>, right:<path d="m9 6 6 6-6 6"/>,
 menu:<path d="M4 6.5h16M4 12h16M4 17.5h16"/>,
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

const cats=[['Autos','motor','car'],['Inmuebles','inmobiliaria','building'],['Electrónica','electronica','phone'],['Moda','moda','shirt'],['Hogar','hogar','sofa'],['Deportes','ocio','ball'],['Mascotas','mascotas','paw'],['Trabajo','empleo','briefcase'],['Servicios','servicios','tool'],['Más','productos','more']];
const col=[['Vive tu ciudad','/marketing/clasificados-banner-square.png'],['Tecnología','/seller-dashboard-mockup.jpg'],['Hogar con estilo','/og-default-1200x630.jpg'],['Deporte y aventura','/marketing/clasificados-banner-1350.png']];
const cities=['Ciudad de México','Guadalajara','Monterrey','Puebla','Querétaro'];

function imageFor(ad,getImageUrl){const x=ad&& (ad.image_url||ad.image||ad.thumbnail);if(!x)return '/og-default-1200x630.jpg';try{return getImageUrl?getImageUrl(x):x}catch{return x}}
function Ad({ad,i,getImageUrl,onOpen,compact=false}){const price=Number(ad&&ad.price||0);return <button className={'mcg-ad'+(compact?' compact':'')} onClick={()=>onOpen&&onOpen(ad)}><div className="mcg-ad-media"><img src={imageFor(ad,getImageUrl)} alt={ad&&ad.title||'Anuncio Mercasto'}/><span><Icon name="heart" size={18}/></span></div><div className="mcg-ad-body"><b>{ad&&ad.title||['Toyota Corolla 2020','Sofá moderno','iPhone 14 128GB','Bicicleta urbana'][i%4]}</b><strong>{price?'$'+price.toLocaleString('es-MX'):['$320,000','$5,800','$11,500','$4,200'][i%4]}</strong><small><Icon name="pin" size={12}/>{ad&&ad.location||'CDMX'}</small></div></button>}

function Header({publish,city}){
 const [dark,setDark]=React.useState(()=>document.documentElement.classList.contains('dark'));
 const toggle=()=>{const n=!document.documentElement.classList.contains('dark');document.documentElement.classList.toggle('dark',n);try{localStorage.setItem('theme',n?'dark':'light')}catch{}setDark(n)};
 return <header className="mcg-header"><a href="/" className="mcg-brand"><span>M</span>Mercasto</a><nav><a href="/listings">Comprar</a><button onClick={publish}>Vender</button><a href="/categorias">Categorías</a><a href="/mapa">Mapa</a><a href="/comunidad">Comunidades</a><a href="/ayuda">Ayuda</a></nav><button className="mcg-location" onClick={city}><Icon name="pin" size={15}/>Ciudad de México<Icon name="down" size={14}/></button><button className="mcg-lang"><Icon name="globe" size={16}/>ES</button><button className={'mcg-theme '+(dark?'dark':'')} onClick={toggle}><span/></button><a href="/favoritos" className="mcg-hicon"><Icon name="heart"/></a><a href="/mensajes" className="mcg-hicon"><Icon name="chat"/></a><button className="mcg-hicon"><Icon name="menu"/></button></header>
}

export default function MercastoGoldenHome({serverAds=[],featuredAds=[],executeSearch,setSearchQuery,setActiveCat,setSearchLocationInput,setSelectedState,handleViewAd,getImageUrl}){
 const nav=useNavigate(); const [q,setQ]=React.useState('');
 const ads=React.useMemo(()=>{const seen=new Set();const list=[...featuredAds,...serverAds].filter(a=>a&&a.id&&!seen.has(a.id)&&seen.add(a.id));return list.length?list.slice(0,12):Array.from({length:8},(_,i)=>({id:'demo-'+i}))},[featuredAds,serverAds]);
 React.useEffect(()=>{document.body.classList.add('mc-golden-home-active');return()=>document.body.classList.remove('mc-golden-home-active')},[]);
 const search=()=>{setSearchQuery&&setSearchQuery(q);executeSearch&&executeSearch(q,null,undefined);nav('/listings')};
 const category=s=>{setActiveCat&&setActiveCat(s);executeSearch&&executeSearch('',null,s);nav('/listings')};
 const publish=()=>nav('/post');
 const city=(x='Ciudad de México')=>{setSearchLocationInput&&setSearchLocationInput(x);setSelectedState&&setSelectedState(x);executeSearch&&executeSearch('',x,undefined);nav('/listings')};
 return <main className="mcg-root"><Header publish={publish} city={()=>city()}/>
 <div className="mcg-desktop">
  <section className="mcg-hero"><div className="mcg-hero-copy"><h1>Cosas increíbles<br/>más cerca de ti</h1><p>Compra y vende de forma fácil, segura y local.<br/>Personas reales. Oportunidades reales.</p><div className="mcg-search"><Icon name="search"/><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Buscar en Mercasto..."/><button onClick={search}>Buscar</button></div><div className="mcg-chips">{cats.slice(0,5).map(c=><button key={c[0]} onClick={()=>category(c[1])}>{c[0]}</button>)}</div></div><div className="mcg-hero-photo"><img src="/marketing/clasificados-banner-1350.png" alt=""/></div></section>
  <section className="mcg-metrics"><div><Icon name="users"/><b>+2.5M</b><small>Personas en Mercasto</small></div><div><Icon name="document"/><b>+780K</b><small>Publicaciones activas</small></div><div><Icon name="pin"/><b>+150</b><small>Ciudades</small></div><div><Icon name="shield"/><b>98%</b><small>Transacciones seguras</small></div></section>
  <section className="mcg-cats">{cats.map(c=><button key={c[0]} onClick={()=>category(c[1])}><span><Icon name={c[2]} size={25}/></span><b>{c[0]}</b></button>)}</section>
  <Section title="Explora cerca de ti" link="/mapa" sub="Descubre oportunidades en tu zona"><div className="mcg-near"><button className="mcg-map" onClick={()=>nav('/mapa')}><div/><i className="p1"><Icon name="pin"/></i><i className="p2"><Icon name="pin"/></i><i className="p3"><Icon name="pin"/></i><i className="p4"><Icon name="pin"/></i><b>CDMX</b></button><div className="mcg-near-ads">{ads.slice(0,3).map((a,i)=><Ad key={a.id} ad={a} i={i} compact getImageUrl={getImageUrl} onOpen={handleViewAd}/>)}</div></div></Section>
  <Section title="Oportunidades del día" link="/listings"><div className="mcg-offers">{ads.slice(2,8).map((a,i)=><Ad key={String(a.id)+'o'} ad={a} i={i+2} getImageUrl={getImageUrl} onOpen={handleViewAd}/>)}</div></Section>
  <Section title="Colecciones para ti" link="/categorias"><div className="mcg-collections">{col.map(c=><button key={c[0]} style={{backgroundImage:'linear-gradient(0deg,rgba(0,0,0,.6),rgba(0,0,0,.04)),url("'+c[1]+'")'}}><b>{c[0]}</b><small>Explorar colección</small></button>)}</div></Section>
  <section className="mcg-ai"><div><span><Icon name="spark" size={16}/>Mercasto AI</span><h2>Tu asistente inteligente de compra y venta</h2><ul><li>Encuentra lo que necesitas más rápido</li><li>Recibe recomendaciones personalizadas</li><li>Resuelve tus dudas al instante</li></ul></div><div className="mcg-bot"><Icon name="bot" size={72}/></div><button onClick={()=>nav('/ai')}>Habla con Mercasto AI</button><div className="mcg-ai-actions"><button><Icon name="search"/>Buscar por foto</button><button><Icon name="compare"/>Comparar precios</button><button onClick={publish}><Icon name="document"/>Crear anuncio</button><button><Icon name="spark"/>Consejos inteligentes</button></div></section>
  <Section title="Por qué Mercasto?"><div className="mcg-why">{[['pin','Más cerca de ti','Compra y vende en tu ciudad'],['users','Personas reales','Comunidad verificada'],['shield','Transacciones seguras','Tu seguridad es primero'],['spark','Un impacto positivo','Apoyamos lo local']].map(x=><div key={x[1]}><Icon name={x[0]}/><b>{x[1]}</b><small>{x[2]}</small></div>)}</div></Section>
  <Section title="Ciudades populares"><div className="mcg-cities">{cities.map((x,i)=><button key={x} onClick={()=>city(x)} style={{backgroundImage:'linear-gradient(0deg,rgba(0,0,0,.62),rgba(0,0,0,.03)),url("'+col[i%4][1]+'")'}}>{x}</button>)}</div></Section>
  <section className="mcg-sell"><div><Icon name="plus" size={32}/><span><h3>Vende lo que ya no usas</h3><p>Publica gratis y llega a millones de personas.</p></span><button onClick={publish}>Publica gratis ahora</button></div><div><Icon name="shield" size={32}/><span><h3>Compra con confianza</h3><p>Consejos y herramientas para comprar mejor.</p></span><a href="/seguridad">Ver consejos</a></div></section>
  <section className="mcg-bottom-content"><div><h3>Historias de la comunidad</h3><p>Personas de todo México conectando y encontrando nuevas oportunidades cada día.</p><a href="/comunidad">Conoce la comunidad</a></div><div><h3>Consejos y novedades</h3><p>Cómo vender más rápido en Mercasto</p><p>Guía para comprar con seguridad</p><p>Ideas para encontrar grandes oportunidades</p></div><div><h3>Mercasto en tu bolsillo</h3><p>Compra, vende y conversa desde cualquier lugar.</p><button>Descargar aplicación</button></div></section>
  <footer className="mcg-footer"><div><a className="mcg-brand" href="/"><span>M</span>Mercasto</a><p>Un México con más oportunidades.</p></div><div><b>Mercasto</b><a href="/sobre-mercasto">Sobre nosotros</a><a href="/blog">Blog</a><a href="/ayuda">Ayuda</a></div><div><b>Comprar</b><a href="/categorias">Categorías</a><a href="/mapa">Mapa</a><a href="/favoritos">Favoritos</a></div><div><b>Vender</b><button onClick={publish}>Publicar anuncio</button><a href="/pro">Mercasto Pro</a></div><div><b>Seguridad</b><a href="/seguridad">Centro de seguridad</a><a href="/contacto">Contacto</a></div></footer>
 </div>
 <DeviceLayouts q={q} setQ={setQ} search={search} category={category} publish={publish} nav={nav} ads={ads} getImageUrl={getImageUrl} handleViewAd={handleViewAd}/>
 </main>
}
function Section({title,sub,link,children}){return <section className="mcg-section"><div className="mcg-section-head"><div><h2>{title}</h2>{sub&&<p>{sub}</p>}</div>{link&&<a href={link}>Ver todos <Icon name="right" size={15}/></a>}</div>{children}</section>}
function DeviceLayouts({q,setQ,search,category,publish,nav,ads,getImageUrl,handleViewAd}){
 const actions=[['search','Buscar productos','Miles de anuncios cerca de ti'],['compare','Comparar opciones','Encuentra la mejor opción'],['plus','Crear publicación','Vende fácil y rápido'],['home','Ideas para mi hogar','Consejos e inspiración']];
 return <><div className="mcg-tablet"><div className="mcg-intro"><h1>Encuentra, compra y vende</h1><p>Un México con más oportunidades para todos</p></div><div className="mcg-dsearch"><div><Icon name="search"/><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Qué estás buscando?"/></div><button onClick={()=>nav('/listings')}><Icon name="filter"/>Filtros</button></div><section className="mcg-device-ai"><div className="main"><span>NUEVO</span><h2>Mercasto AI</h2><p>Te ayuda a encontrar justo<br/>lo que necesitas</p><button onClick={()=>nav('/ai')}>Probar ahora</button><div className="bigbot"><Icon name="bot" size={88}/></div><div className="bubble">Hola<br/>Soy Mercasto AI<br/>En qué te puedo ayudar hoy?</div></div><div className="chat"><h3>Chat con Mercasto AI</h3><Icon name="bot" size={34}/><p>Obtén recomendaciones,<br/>compara opciones y mucho más</p><button onClick={()=>nav('/ai')}>Hablar ahora</button></div></section><div className="mcg-actions">{actions.map((a,i)=><button key={a[1]} onClick={i===2?publish:()=>nav('/listings')}><span><Icon name={a[0]}/></span><b>{a[1]}</b><small>{a[2]}</small></button>)}</div><DeviceCategories category={category}/><div className="mcg-device-section"><Head title="Búsquedas recientes"/><div className="mcg-recents">{['laptop','sofá','iphone','casa en renta','bicicleta'].map(x=><button key={x}><Icon name="search"/><span><b>{x}</b><small>Ver resultados</small></span><Icon name="right"/></button>)}</div></div><DeviceAds ads={ads} getImageUrl={getImageUrl} handleViewAd={handleViewAd}/></div>
 <div className="mcg-mobile"><div className="mcg-msearch"><div><Icon name="search"/><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Buscar en Mercasto..."/></div><button onClick={()=>nav('/listings')}><Icon name="filter"/></button></div><section className="mcg-mobile-ai"><h1>Mercasto AI <small>BETA</small></h1><h2>Tu asistente inteligente<br/>para <em>comprar, vender</em><br/>y crear publicaciones.</h2><div><Icon name="bot" size={70}/></div></section><section className="mcg-mobile-chat"><Icon name="bot"/><p><b>Mercasto AI</b><br/>Hola! En qué te puedo ayudar hoy?</p><button onClick={()=>nav('/ai')}><Icon name="right"/></button></section><div className="mcg-mactions">{actions.slice(0,3).map((a,i)=><button key={a[1]} onClick={i===2?publish:()=>nav('/listings')}><span><Icon name={a[0]}/></span><b>{a[1]}</b><Icon name="right"/></button>)}</div><DeviceCategories category={category}/><DeviceAds ads={ads} getImageUrl={getImageUrl} handleViewAd={handleViewAd}/></div>
 <nav className="mcg-bottom-nav"><a href="/" className="active"><Icon name="home"/><span>Inicio</span></a><a href="/listings"><Icon name="search"/><span>Buscar</span></a><button onClick={publish} className="publish"><i><Icon name="plus"/></i><b>Publicar</b></button><a href="/categorias"><Icon name="grid"/><span>Categorías</span></a><a href="/cuenta"><Icon name="user"/><span>Mi cuenta</span></a></nav></>
}
function Head({title}){return <div className="mcg-device-head"><h2>{title}</h2><a href="/listings">Ver todas</a></div>}
function DeviceCategories({category}){return <div className="mcg-device-section"><Head title="Explora por categoría"/><div className="mcg-device-categories">{cats.slice(0,9).map(c=><button key={c[0]} onClick={()=>category(c[1])}><span><Icon name={c[2]}/></span>{c[0]}</button>)}</div></div>}
function DeviceAds({ads,getImageUrl,handleViewAd}){return <div className="mcg-device-section"><Head title="Resultados recomendados para ti"/><div className="mcg-device-ads">{ads.slice(0,4).map((a,i)=><Ad key={String(a.id)+'d'} ad={a} i={i} getImageUrl={getImageUrl} onOpen={handleViewAd}/>)}</div></div>}
