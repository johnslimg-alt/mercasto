import React from 'react';

const POPULAR_SEARCH_TERMS = [
  'iphone 15', 'samsung s24', 'departamento renta cdmx', 'casa venta guadalajara',
  'honda civic', 'toyota corolla', 'trabajo remoto', 'recepcionista', 'nintendo switch',
  'ps5', 'macbook', 'trabajo medio tiempo', 'bicicleta', 'escritorio', 'sala',
  'refrigerador', 'lavadora', 'golden retriever', 'gatitos', 'terreno', 'local comercial',
  'moto italika', 'yamaha', 'abogado', 'contador', 'plomero', 'electricista',
  'clases ingles', 'uber carro', 'airbnb amueblado',
];

const POPULAR_CITIES = [
  { name: 'Ciudad de México', count: '284,392', highlight: true },
  { name: 'Guadalajara', count: '198,445' },
  { name: 'Monterrey', count: '156,221' },
  { name: 'Puebla', count: '89,334' },
  { name: 'Tijuana', count: '76,551' },
  { name: 'Aguascalientes', count: '47,882', highlight: true },
  { name: 'San Luis Potosí', count: '47,882' },
  { name: 'Cancún', count: '58,992' },
  { name: 'Mérida', count: '52,110' },
  { name: 'Querétaro', count: '71,884' },
  { name: 'León', count: '64,223' },
  { name: 'Playa del Carmen', count: '39,445' },
  { name: 'Tulum', count: '28,331' },
  { name: 'Zapopan', count: '61,223' },
  { name: 'Tlaquepaque', count: '34,556' },
  { name: 'Culiacán', count: '41,882' },
  { name: 'Hermosillo', count: '38,991' },
  { name: 'Chihuahua', count: '44,221' },
  { name: 'Cabo San Lucas', count: '31,882' },
];

export function PopularSearchesSection({ t, runSearch }) {
  return (
    <section className="col-span-12">
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[17px]">{t.popular_searches || 'Búsquedas populares'}</h3>
          <span className="text-[12px] text-slate-500">{t.updated_hourly || 'Actualizado hace 1h'}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {POPULAR_SEARCH_TERMS.map(term => (
            <a key={term} href={`/listings?q=${encodeURIComponent(term)}`} onClick={(e) => { e.preventDefault(); runSearch(term); }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-[13px] cursor-pointer">{term}</a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CitiesSection({ t, applyCityFilter, onViewAllMexico }) {
  return (
    <section className="col-span-12">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[17px]">{t.explore_city || 'Explorar por ciudad'}</h3>
        <a href="/listings" onClick={(e) => { e.preventDefault(); onViewAllMexico(); }} className="text-[13px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer">{t.view_all_mexico || 'Ver todo México →'}</a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
        {POPULAR_CITIES.map(city => (
          <a key={city.name} href={`/listings?location=${encodeURIComponent(city.name)}`} onClick={(e) => { e.preventDefault(); applyCityFilter(city.name); }} className={`bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 hover:shadow-sm flex justify-between items-center cursor-pointer ${city.highlight ? 'ring-2 ring-[#84CC16]/40' : ''}`}>
            <span className={`text-[14px] ${city.highlight ? 'font-medium' : ''}`}>{city.name}</span>
            <span className={`text-[12px] ${city.highlight ? 'text-lime-800 dark:text-lime-400 font-semibold' : 'text-slate-500'}`}>{city.count}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

export function NewsletterSection({ t, showHomeToast }) {
  return (
    <section className="col-span-12">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div>
          <h3 className="font-bold text-[18px]">{t.newsletter_title || 'Recibe las mejores ofertas de México'}</h3>
          <p className="text-[13px] text-slate-600">{t.newsletter_desc || 'Resumen semanal de ofertas, caída de precios y nuevos empleos.'}</p>
        </div>
        <form className="flex w-full md:w-auto gap-2" onSubmit={e => { e.preventDefault(); showHomeToast(t.newsletter_subscribed_toast); e.target.reset(); }}>
          <input type="email" aria-label={t.your_email} required placeholder={t.your_email || 'Tu correo electrónico'} className="w-full md:w-[300px] px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]"/>
          <button data-testid="home-newsletter-submit" type="submit" className="btn-md bg-[#84CC16] text-slate-950 hover:bg-[#65A30D] whitespace-nowrap">{t.subscribe || 'Suscribirse'}</button>
        </form>
      </div>
    </section>
  );
}
