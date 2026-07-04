import { getTranslations, normalizeLanguage } from './translations';

const content = {
  autos: {
    es: ['Encuentra tu auto ideal en México', 'Miles de autos nuevos y usados al mejor precio', 'Buscar por marca, modelo, año…', 'Vehículos destacados'],
    en: ['Find your ideal car in Mexico', 'Thousands of new and used cars at the best price', 'Search by make, model or year…', 'Featured vehicles'],
    ru: ['Найдите идеальный автомобиль в Мексике', 'Тысячи новых и подержанных автомобилей', 'Марка, модель или год…', 'Популярные автомобили'],
    de: ['Finden Sie Ihr ideales Auto in Mexiko', 'Tausende Neu- und Gebrauchtwagen', 'Marke, Modell oder Baujahr…', 'Empfohlene Fahrzeuge'],
    fr: ['Trouvez votre voiture idéale au Mexique', 'Des milliers de voitures neuves et d’occasion', 'Marque, modèle ou année…', 'Véhicules en vedette'],
  },
  motor: {
    es: ['Encuentra tu vehículo ideal y repuestos', 'Autos, motos, camionetas, refacciones y más al mejor precio', 'Buscar por marca, modelo, tipo…', 'Destacados en Motor'],
    en: ['Find your ideal vehicle and parts', 'Cars, bikes, trucks, parts and more at the best price', 'Search by make, model or type…', 'Featured in Motor'],
    ru: ['Найдите транспорт и запчасти в Мексике', 'Авто, мотоциклы, грузовики и автозапчасти', 'Марка, модель или тип…', 'Популярное в разделе Мотор'],
    de: ['Finden Sie Ihr ideales Fahrzeug und Teile', 'Autos, Motorräder, LKWs, Teile und mehr', 'Marke, Modell oder Typ…', 'Beliebt in Motor'],
    fr: ['Trouvez votre véhicule idéal et pièces', 'Voitures, motos, camions, pièces et plus', 'Marque, modèle ou type…', 'En vedette dans Moteur'],
  },
  inmuebles: {
    es: ['Encuentra propiedades en México', 'Compra, renta o invierte en los mejores inmuebles del país', 'Ciudad, colonia o tipo de propiedad…', 'Propiedades destacadas'],
    en: ['Find properties in Mexico', 'Buy, rent or invest in properties across the country', 'City, neighborhood or property type…', 'Featured properties'],
    ru: ['Найдите недвижимость в Мексике', 'Покупайте, арендуйте и инвестируйте', 'Город, район или тип недвижимости…', 'Популярная недвижимость'],
    de: ['Immobilien in Mexiko finden', 'Kaufen, mieten oder investieren', 'Stadt, Viertel oder Immobilientyp…', 'Empfohlene Immobilien'],
    fr: ['Trouvez un bien immobilier au Mexique', 'Achetez, louez ou investissez', 'Ville, quartier ou type de bien…', 'Biens en vedette'],
  },
  servicios: {
    es: ['Contrata profesionales verificados', 'Especialistas confiables cerca de ti', 'Servicio, profesional o ciudad…', 'Servicios destacados'],
    en: ['Hire verified professionals', 'Trusted specialists near you', 'Service, professional or city…', 'Featured services'],
    ru: ['Найдите проверенных специалистов', 'Надёжные специалисты рядом с вами', 'Услуга, специалист или город…', 'Популярные услуги'],
    de: ['Geprüfte Fachkräfte beauftragen', 'Vertrauenswürdige Profis in Ihrer Nähe', 'Dienstleistung, Fachkraft oder Stadt…', 'Empfohlene Dienste'],
    fr: ['Engagez des professionnels vérifiés', 'Des spécialistes de confiance près de vous', 'Service, professionnel ou ville…', 'Services en vedette'],
  },
  empleos: {
    es: ['Encuentra trabajo en México', 'Miles de oportunidades laborales en todo el país', 'Puesto, empresa o ciudad…', 'Empleos recientes'],
    en: ['Find jobs in Mexico', 'Thousands of opportunities across the country', 'Job title, company or city…', 'Recent jobs'],
    ru: ['Найдите работу в Мексике', 'Тысячи вакансий по всей стране', 'Должность, компания или город…', 'Новые вакансии'],
    de: ['Jobs in Mexiko finden', 'Tausende Stellenangebote im ganzen Land', 'Position, Unternehmen oder Stadt…', 'Aktuelle Stellen'],
    fr: ['Trouvez un emploi au Mexique', 'Des milliers d’opportunités dans tout le pays', 'Poste, entreprise ou ville…', 'Offres récentes'],
  },
  productos: {
    es: ['Compra y vende artículos en México', 'Miles de productos nuevos y usados al mejor precio', 'Buscar productos, marcas, categorías…', 'Artículos destacados'],
    en: ['Buy and sell items in Mexico', 'Thousands of new and used products at the best price', 'Search goods, brands, categories…', 'Featured items'],
    ru: ['Покупайте и продавайте товары в Мексике', 'Тысячи новых и б/у товаров по лучшим ценам', 'Поиск товаров, брендов, категорий…', 'Популярные товары'],
    de: ['Kaufen und verkaufen Sie Artikel in Mexiko', 'Tausende neue und gebrauchte Produkte', 'Waren, Marken, Kategorien suchen…', 'Empfohlene Artikel'],
    fr: ['Achetez et vendez des articles au Mexique', 'Des milliers de produits neufs et d\'occasion', 'Rechercher des articles, marques, catégories…', 'Articles en vedette'],
  },
  turismo: {
    es: ['Explora el turismo y aventuras en México', 'Hoteles, hospedaje, tours, boletos a eventos y artículos de viaje', 'Buscar hoteles, tours, destinos…', 'Destacados en Turismo'],
    en: ['Explore tourism and adventures in Mexico', 'Hotels, lodging, tours, event tickets and travel gear', 'Search hotels, tours, destinations…', 'Featured in Tourism'],
    ru: ['Откройте для себя туризм и отдых в Мексике', 'Отели, жилье, туры, билеты на мероприятия и товары для туризма', 'Поиск отелей, туров, направлений…', 'Популярное в разделе Туризм'],
    de: ['Entdecken Sie Tourismus und Abenteuer in Mexiko', 'Hotels, Unterkünfte, Touren und Tickets', 'Nach Hotels, Touren, Zielen suchen…', 'Beliebt in Tourismus'],
    fr: ['Découvrez le tourisme et l\'aventure au Mexique', 'Hôtels, hébergement, circuits et billets', 'Rechercher des hôtels, circuits, destinations…', 'En vedette dans Tourisme'],
  },
};

export function getVerticalCopy(language, vertical) {
  const lang = normalizeLanguage(language);
  const t = getTranslations(lang);
  const values = content[vertical]?.[lang] || content[vertical]?.en || content[vertical]?.es;
  return {
    title: values[0],
    subtitle: values[1],
    placeholder: values[2],
    featured: values[3],
    labels: {
      allMexico: t.all_mexico,
      allCity: t.all_city || t.city,
      city: t.city,
      search: t.search_btn,
      mapAds: t.search_map || t.view_map || 'View listings on map',
      radius: t.radius || 'radius',
      mapActive: t.map || 'Map',
      nearby: t.near_you || 'Listings near',
      mapHelp: t.map_help || 'Filter by state, city and radius.',
      apply: t.apply_filters || t.search_btn,
      openMap: t.open_map || t.map,
      viewList: t.view_list || 'View list',
      viewAll: t.view_all,
    },
  };
}
