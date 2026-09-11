import React from 'react';

const POPULAR_SEARCH_TERMS = [
  'iphone 15', 'samsung s24', 'departamento renta cdmx', 'casa venta guadalajara',
  'honda civic', 'toyota corolla', 'trabajo remoto', 'recepcionista', 'nintendo switch',
  'ps5', 'macbook', 'trabajo medio tiempo', 'bicicleta', 'escritorio', 'sala',
  'refrigerador', 'lavadora', 'golden retriever', 'gatitos', 'terreno', 'local comercial',
  'moto italika', 'yamaha', 'abogado', 'contador', 'plomero', 'electricista',
  'clases ingles', 'uber carro', 'airbnb amueblado',
];

// Names only. The counts that used to travel with these cities were invented
// strings ("284,392"), and the launch rules forbid fabricated counters, so the
// V2 variant renders the city without a number while the legacy variant keeps
// its existing markup untouched.
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

export function PopularSearchesSection({ t, runSearch, variant = 'default' }) {
  if (variant === 'v2') {
    return (
      <section className="v2-discovery" data-testid="v2-popular-searches">
        <div className="v2-section-head">
          <h2>{t.popular_searches || 'Búsquedas populares'}</h2>
          <span className="v2-discovery-note">{t.updated_hourly || 'Actualizado hace 1h'}</span>
        </div>
        <div className="v2-chip-row">
          {POPULAR_SEARCH_TERMS.map(term => (
            <button
              key={term}
              type="button"
              className="v2-chip"
              onClick={() => runSearch(term)}
            >
              {term}
            </button>
          ))}
        </div>
      </section>
    );
  }

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

export function CitiesSection({ t, applyCityFilter, onViewAllMexico, variant = 'default' }) {
  if (variant === 'v2') {
    return (
      <section className="v2-section" data-testid="v2-cities">
        <div className="v2-section-head">
          <h2>{t.explore_city || 'Explorar por ciudad'}</h2>
          <button type="button" className="v2-section-link" onClick={onViewAllMexico}>
            {t.view_all_mexico || 'Ver todo México →'}
          </button>
        </div>
        <div className="v2-city-grid">
          {POPULAR_CITIES.map(city => (
            <button
              key={city.name}
              type="button"
              className={'v2-city' + (city.highlight ? ' is-highlight' : '')}
              onClick={() => applyCityFilter(city.name)}
            >
              {city.name}
            </button>
          ))}
        </div>
      </section>
    );
  }

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

export function NewsletterSection({ t, showHomeToast, variant = 'default' }) {
  const submit = (e) => {
    e.preventDefault();
    showHomeToast(t.newsletter_subscribed_toast);
    e.target.reset();
  };

  if (variant === 'v2') {
    return (
      <section className="v2-newsletter" data-testid="v2-newsletter">
        <div className="v2-newsletter-copy">
          <h2>{t.newsletter_title || 'Recibe las mejores ofertas de México'}</h2>
          <p>{t.newsletter_desc || 'Resumen semanal de ofertas, caída de precios y nuevos empleos.'}</p>
        </div>
        <form className="v2-newsletter-form" onSubmit={submit}>
          <input
            type="email"
            required
            aria-label={t.your_email}
            placeholder={t.your_email || 'Tu correo electrónico'}
          />
          <button data-testid="home-newsletter-submit" type="submit">
            {t.subscribe || 'Suscribirse'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="col-span-12">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div>
          <h3 className="font-bold text-[18px]">{t.newsletter_title || 'Recibe las mejores ofertas de México'}</h3>
          <p className="text-[13px] text-slate-600">{t.newsletter_desc || 'Resumen semanal de ofertas, caída de precios y nuevos empleos.'}</p>
        </div>
        <form className="flex w-full md:w-auto gap-2" onSubmit={submit}>
          <input type="email" aria-label={t.your_email} required placeholder={t.your_email || 'Tu correo electrónico'} className="w-full md:w-[300px] px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] text-[14px]"/>
          <button data-testid="home-newsletter-submit" type="submit" className="btn-md bg-[#84CC16] text-slate-950 hover:bg-[#65A30D] whitespace-nowrap">{t.subscribe || 'Suscribirse'}</button>
        </form>
      </div>
    </section>
  );
}
