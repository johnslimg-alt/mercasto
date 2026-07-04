import { filterConfig } from './filterConfig.js';

const labels = (es, en, customTranslations = {}) => ({
  es, en,
  pt: customTranslations.pt || en,
  fr: customTranslations.fr || en,
  zh: customTranslations.zh || en,
  ko: customTranslations.ko || en,
  de: customTranslations.de || en,
  it: customTranslations.it || en,
  ar: customTranslations.ar || en,
  he: customTranslations.he || en,
  yi: customTranslations.yi || en,
  ru: customTranslations.ru || es,
  ja: customTranslations.ja || en,
  ...customTranslations
});

export const categorySchema = {
  motor: { aliases: ['coches'], label: labels('Motor', 'Motor'), subcategories: [
    ['autos', 'Autos', 'Cars'], ['motos', 'Motos', 'Motorcycles'], ['camionetas', 'Camionetas', 'Trucks'],
    ['camiones', 'Camiones', 'Commercial trucks'], ['bicicletas', 'Bicicletas', 'Bicycles'], ['refacciones', 'Refacciones', 'Parts'], ['autopartes', 'Autopartes', 'Auto parts'],
  ] },
  coches: { canonical: 'motor', label: labels('Motor', 'Motor') },
  productos: { label: labels('Productos', 'Goods', {
    pt: 'Produtos', fr: 'Produits', zh: '商品', ko: '상품', de: 'Waren', it: 'Prodotti',
    ar: 'السلع', he: 'מוצרים', yi: 'סכוירע', ru: 'Товары', ja: '商品'
  }), subcategories: [
    ['electronica', 'Electrónica', 'Electronics'], ['hogar', 'Hogar y jardín', 'Home & Garden'],
    ['moda', 'Moda y belleza', 'Fashion & Beauty'], ['ocio', 'Ocio', 'Hobbies'],
    ['infantil', 'Infantil', 'Kids'], ['mascotas', 'Mascotas', 'Pets'],
    ['formacion', 'Formación y libros', 'Education'],
  ] },
  turismo: { label: labels('Turismo', 'Tourism', {
    pt: 'Turismo', fr: 'Tourisme', zh: '旅游', ko: '관광', de: 'Tourismus', it: 'Turismo',
    ar: 'السياحة', he: 'תיירות', yi: 'טוריזם', ru: 'Туризм', ja: '観光'
  }), subcategories: [
    ['hospedaje', 'Hoteles y Hospedaje', 'Hotels & Lodging', {
      pt: 'Hotéis e Hospedagem', fr: 'Hôtels et Hébergement', zh: '酒店与住宿', ko: '호텔 및 숙박', de: 'Hotels & Unterkünfte', it: 'Hotel e Alloggi',
      ar: 'الفنادق والإقامة', he: 'מלונות ואירוח', yi: 'האטעלן און לאדזשינג', ru: 'Отели и жилье', ja: 'ホテルと宿泊施設'
    }],
    ['tours', 'Tours y Viajes', 'Tours & Trips', {
      pt: 'Passeios e Viagens', fr: 'Visites et Voyages', zh: '旅游与行程', ko: '투어 및 여행', de: 'Touren & Reisen', it: 'Tour e Viaggi',
      ar: 'الجولات والرحلات', he: 'סיורים וטיולים', yi: 'טורס און טריפס', ru: 'Туры и путешествия', ja: 'ツアーと旅行'
    }],
    ['boletos_turismo', 'Boletos a Eventos', 'Event Tickets', {
      pt: 'Ingressos para Eventos', fr: 'Billets d\'Événements', zh: '活动门票', ko: '이벤트 티켓', de: 'Veranstaltungstickets', it: 'Biglietti per Eventi',
      ar: 'تذاكر الفعاليات', he: 'כרטיסים לאירועים', yi: 'בילעטן צו עווענטס', ru: 'Билеты на мероприятия', ja: 'イベントチケット'
    }],
    ['articulos_camping', 'Artículos de Viaje y Outdoor', 'Travel & Outdoor Gear', {
      pt: 'Artigos de Viagem e Outdoor', fr: 'Articles de Voyage et Outdoor', zh: '旅游与户外装备', ko: '여행 및 아웃도어 용품', de: 'Reise- & Outdoor-Ausrüstung', it: 'Articoli da Viaggio e Outdoor',
      ar: 'معدات السفر والهواء الطلق', he: 'ציוד נסיעות ושטח', yi: 'רייזע און אָוטדאָאָר שטאָפּ', ru: 'Товары для туризма', ja: '旅行＆アウトドア用品'
    }],
    ['souvenirs', 'Souvenirs y Regalos', 'Souvenirs & Gifts', {
      pt: 'Souvenirs e Presentes', fr: 'Souvenirs et Cadeaux', zh: '纪念品与 gifts', ko: '기념품 및 선물', de: 'Souvenirs & Geschenke', it: 'Souvenir e Regali',
      ar: 'الهدايا التذكارية والهدايا', he: 'מזכרות ומתנות', yi: 'סוווענירס און גיפטס', ru: 'Сувениры и подарки', ja: 'お土産とギフト'
    }],
    ['renta_vehiculos', 'Renta de Transporte', 'Transport Rental', {
      pt: 'Aluguel de Transporte', fr: 'Location de Transports', zh: '交通工具租赁', ko: '교통수단 대여', de: 'Transportvermietung', it: 'Noleggio Trasporti',
      ar: 'تأجير وسائل النقل', he: 'השכרת כלי תחבורה', yi: 'רענטאַל פון טראַנספּאָרט', ru: 'Аренда транспорта', ja: '交通機関レンタル'
    }],
    ['guias_servicios', 'Guías y Servicios', 'Guides & Services', {
      pt: 'Guias e Serviços', fr: 'Guides et Services', zh: '导游与服务', ko: '가이드 및 서비스', de: 'Guides & Dienstleistungen', it: 'Guide e Servizi',
      ar: 'المرشدين والخدمات', he: 'מדריכים ושירותים', yi: 'גוידס און סערוויסעס', ru: 'Гиды и услуги', ja: 'ガイドとサービス'
    }],
    ['atracciones_exp', 'Atracciones y Experiencias', 'Attractions & Experiences', {
      pt: 'Atrações e Experiências', fr: 'Attractions et Expériences', zh: '景点与体验', ko: '명소 및 체험', de: 'Attraktionen & Erlebnisse', it: 'Attrazioni ed Esperienze',
      ar: 'المعالم السياحية والتجارب', he: 'אטרקציות וחוויות', yi: 'אַטראַקשאַנז און עקספּעריענסעס', ru: 'Развлечения и опыт', ja: 'アトラクションと体験'
    }],
    ['retiros_bienestar', 'Retiros y Bienestar', 'Retreats & Wellness', {
      pt: 'Retiros e Bem-Estar', fr: 'Retraites et Bien-être', zh: '静修与健康', ko: '리트릿 및 웰빙', de: 'Retreats & Wellness', it: 'Ritiri e Benessere',
      ar: 'المنتجعات الصحية والعافية', he: 'ריטריטים ובריאות', yi: 'רעטרעאַץ און וועלנעס', ru: 'Ретриты и велнес', ja: 'リトリートとウェルネス'
    }],
  ] },
  renta_vehiculos: { parent: 'turismo', label: labels('Renta de Transporte', 'Transport Rental', {
    pt: 'Aluguel de Transporte', fr: 'Location de Transports', zh: '交通工具租赁', ko: '교통수단 대여', de: 'Transportvermietung', it: 'Noleggio Trasporti',
    ar: 'تأجير وسائل النقل', he: 'השכרת כלי תחבורה', yi: 'רענטאַל פון טראַנספּאָרט', ru: 'Аренда транспорта', ja: '交通機関レンタル'
  }), subcategories: [
    ['renta_autos', 'Renta de Autos', 'Car Rental'],
    ['renta_motos', 'Motos y Scooters', 'Motorcycles & Scooters'],
    ['renta_bicis', 'Renta de Bicicletas', 'Bicycle Rental'],
    ['renta_yates', 'Yates y Barcos', 'Yachts & Boats'],
    ['renta_acuatico', 'Motos Acuáticas y Jetski', 'Jetski & Water Sports'],
    ['renta_equipamiento', 'Surf, Kayaks y Tablas', 'Surfboards & Kayaks'],
    ['renta_quads', 'Quads, Buggies y ATV', 'ATVs & Buggies'],
    ['renta_campers', 'Campers y Casas Rodantes', 'Campers & RVs'],
  ] },
  guias_servicios: { parent: 'turismo', label: labels('Guías y Servicios', 'Guides & Services'), subcategories: [
    ['servicios_guias', 'Guías y Traductores', 'Guides & Translators'],
    ['servicios_fotografos', 'Fotógrafos de Viaje', 'Travel Photographers'],
    ['servicios_transfer', 'Transfers y Taxis', 'Transfers & Taxis'],
  ] },
  atracciones_exp: { parent: 'turismo', label: labels('Atracciones y Experiencias', 'Attractions & Experiences'), subcategories: [
    ['experiencia_parques', 'Parques y Entradas', 'Parks & Entry Tickets'],
    ['experiencia_gastronomia', 'Gastronomía y Catas', 'Gastronomy & Tastings'],
    ['experiencia_deportes', 'Buceo y Deportes de agua', 'Diving & Water Sports'],
  ] },
  retiros_bienestar: { parent: 'turismo', label: labels('Retiros y Bienestar', 'Retreats & Wellness'), subcategories: [
    ['retiro_spa', 'Spa y Termas', 'Spa & Thermal Baths'],
    ['retiro_yoga', 'Yoga y Meditación', 'Yoga & Meditation'],
    ['retiro_salud', 'Salud y Bienestar', 'Health & Wellness'],
  ] },
  hospedaje: { parent: 'turismo', label: labels('Hoteles y Hospedaje', 'Hotels & Lodging'), subcategories: [
    ['hotel_habitacion', 'Hoteles', 'Hotels'],
    ['casa_huespedes', 'Casas de huéspedes', 'Guest houses'],
    ['hotel_villas', 'Villas y Cabañas', 'Villas & Cabins'],
    ['hostales', 'Hostales', 'Hostels'],
  ] },
  tours: { parent: 'turismo', label: labels('Tours y Viajes', 'Tours & Trips'), subcategories: [
    ['tour_aventura', 'Aventura y Naturaleza', 'Adventure & Nature'],
    ['tour_cultural', 'Tours Culturales', 'Cultural Tours'],
    ['tour_playa', 'Excursiones de Playa', 'Beach Excursions'],
  ] },
  boletos_turismo: { parent: 'turismo', label: labels('Boletos a Eventos', 'Event Tickets'), subcategories: [
    ['boleto_concierto', 'Conciertos', 'Concerts'],
    ['boleto_deportes', 'Deportes', 'Sports'],
    ['boleto_teatro', 'Teatro y Cultura', 'Theatre & Culture'],
  ] },
  articulos_camping: { parent: 'turismo', label: labels('Artículos de Viaje y Outdoor', 'Travel & Outdoor Gear'), subcategories: [
    ['camping_sacos', 'Casas de campaña y Sacos', 'Tents & Sleeping Bags'],
    ['camping_mochilas', 'Mochilas и Maletas', 'Backpacks & Bags'],
    ['camping_ropa', 'Ropa de senderismo', 'Hiking Apparel'],
    ['camping_utensilios', 'Utensilios de cocina y Estufas', 'Camp Kitchen & Stoves'],
    ['camping_gps', 'Linternas y GPS', 'Flashlights & GPS'],
  ] },
  souvenirs: { parent: 'turismo', label: labels('Souvenirs y Regalos', 'Souvenirs & Gifts'), subcategories: [
    ['artesanias', 'Artesanías locales', 'Local Crafts'],
    ['recuerdos', 'Recuerdos de viaje', 'Travel Souvenirs'],
    ['regalos', 'Regalos típicos', 'Traditional Gifts'],
  ] },
  inmobiliaria: { label: labels('Inmuebles', 'Real Estate'), subcategories: [
    ['casas-en-venta', 'Casas en venta', 'Homes for sale'], ['casas-en-renta', 'Casas en renta', 'Homes for rent'],
    ['departamentos', 'Departamentos', 'Apartments'], ['terrenos', 'Terrenos', 'Land'],
    ['locales-comerciales', 'Locales comerciales', 'Commercial'], ['oficinas', 'Oficinas', 'Offices'],
    ['bodegas', 'Bodegas', 'Warehouses'], ['renta-vacacional', 'Renta vacacional', 'Vacation rentals'],
  ] },
  empleo: { label: labels('Empleo', 'Jobs'), subcategories: [
    ['ventas', 'Ventas', 'Sales'], ['chofer', 'Chofer', 'Drivers'], ['construccion', 'Construcción', 'Construction'],
    ['administracion', 'Administración', 'Administration'], ['atencion-al-cliente', 'Atención al cliente', 'Customer service'],
    ['tecnologia', 'Tecnología', 'Technology'], ['hoteleria', 'Hotelería', 'Hospitality'], ['medio-tiempo', 'Medio tiempo', 'Part-time'],
  ] },
  servicios: { label: labels('Servicios', 'Services'), subcategories: [
    ['hogar', 'Hogar', 'Home'], ['reparaciones', 'Reparaciones', 'Repairs'], ['limpieza', 'Limpieza', 'Cleaning'],
    ['clases', 'Clases', 'Lessons'], ['eventos', 'Eventos', 'Events'], ['transporte', 'Transporte', 'Transport'],
    ['mascotas', 'Mascotas', 'Pets'], ['belleza', 'Belleza', 'Beauty'],
  ] },
  electronica: { parent: 'productos', label: labels('Electrónica', 'Electronics'), subcategories: [
    ['telefonos', 'Teléfonos', 'Phones'], ['laptops', 'Laptops', 'Laptops'], ['tablets', 'Tablets', 'Tablets'],
    ['tv-y-video', 'TV y video', 'TV & video'], ['audio', 'Audio', 'Audio'], ['camaras', 'Cámaras', 'Cameras'],
    ['drones', 'Drones', 'Drones'], ['accesorios', 'Accesorios', 'Accessories'],
  ] },
  hogar: { parent: 'productos', label: labels('Hogar y jardín', 'Home & Garden'), subcategories: [
    ['muebles', 'Muebles', 'Furniture'], ['electrodomesticos', 'Electrodomésticos', 'Appliances'],
    ['decoracion', 'Decoración', 'Decor'], ['herramientas', 'Herramientas', 'Tools'], ['jardin', 'Jardín', 'Garden'],
  ] },
  moda: { parent: 'productos', label: labels('Moda y belleza', 'Fashion & Beauty'), subcategories: [
    ['ropa-mujer', 'Ropa de mujer', "Women's clothing"], ['ropa-hombre', 'Ropa de hombre', "Men's clothing"],
    ['calzado', 'Calzado', 'Shoes'], ['bolsos', 'Bolsos', 'Bags'], ['accesorios', 'Accesorios', 'Accessories'],
  ] },
  deportes: { parent: 'productos', canonical: 'ocio', label: labels('Deportes y náutica', 'Sports') },
  infantil: { parent: 'productos', label: labels('Infantil', 'Kids'), subcategories: [
    ['juguetes', 'Juguetes', 'Toys'], ['ropa', 'Ropa infantil', 'Kids clothing'], ['escolar', 'Escolar', 'School'],
    ['muebles', 'Muebles infantiles', 'Kids furniture'], ['seguridad', 'Seguridad', 'Safety'],
  ] },
  mascotas: { parent: 'productos', label: labels('Mascotas', 'Pets'), subcategories: [
    ['perros', 'Perros', 'Dogs'], ['gatos', 'Gatos', 'Cats'], ['aves', 'Aves', 'Birds'],
    ['accesorios', 'Accesorios', 'Accessories'], ['alimento', 'Alimento', 'Food'], ['servicios', 'Servicios', 'Services'],
  ] },
  negocios: { label: labels('Negocios', 'Business'), subcategories: [
    ['traspasos', 'Traspasos', 'Businesses for sale'], ['franquicias', 'Franquicias', 'Franchises'],
    ['maquinaria', 'Maquinaria', 'Machinery'], ['equipamiento', 'Equipamiento', 'Equipment'], ['inversion', 'Inversión', 'Investment'],
  ] },
  formacion: { parent: 'productos', label: labels('Formación y libros', 'Education'), subcategories: [
    ['libros', 'Libros', 'Books'], ['cursos', 'Cursos', 'Courses'], ['idiomas', 'Idiomas', 'Languages'],
    ['certificaciones', 'Certificaciones', 'Certifications'], ['material-escolar', 'Material escolar', 'School supplies'],
  ] },
  ocio: { parent: 'productos', label: labels('Ocio', 'Leisure'), subcategories: [
    ['videojuegos', 'Videojuegos', 'Video games'], ['coleccionismo', 'Coleccionismo', 'Collectibles'],
    ['fotografia', 'Fotografía', 'Photography'], ['instrumentos', 'Instrumentos', 'Instruments'], ['viajes', 'Viajes', 'Travel'],
  ] },
  boletos: { label: labels('Boletos', 'Tickets'), subcategories: [
    ['conciertos', 'Conciertos', 'Concerts'], ['deportes', 'Deportes', 'Sports'], ['teatro', 'Teatro y cultura', 'Theatre'],
    ['festivales', 'Festivales', 'Festivals'], ['conferencias', 'Conferencias', 'Conferences'],
  ] },
};

const normalizeSubcategories = (definition = {}) => (definition.subcategories || []).map(([slug, es, en, custom]) => ({
  slug,
  label: labels(es, en, custom),
}));

export const resolveCategorySchema = (category = '') => {
  const definition = categorySchema[category] || {};
  const canonical = definition.canonical || category;
  const canonicalDefinition = categorySchema[canonical] || definition;
  return {
    slug: category,
    canonical,
    label: definition.label || canonicalDefinition.label || labels(category, category),
    subcategories: normalizeSubcategories(canonicalDefinition),
    attributes: filterConfig[category] || filterConfig[canonical] || [],
  };
};

export const getCategoryFields = (category = '', subcategory = '') => (
  filterConfig[subcategory ? `${category}/${subcategory}` : category]
  || resolveCategorySchema(category).attributes
);
