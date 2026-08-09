import { getTranslations, normalizeLanguage, SUPPORTED_LANGUAGES } from './translations.js';
import { subcategoriesByLang } from '../constants/subcategoryTranslations.js';

const content = {
  autos: {
    es: ['Encuentra tu auto ideal en México', 'Compara anuncios de autos nuevos y usados publicados en México', 'Buscar por marca, modelo, año…', 'Vehículos destacados'],
    en: ['Find your ideal car in Mexico', 'Thousands of new and used cars at the best price', 'Search by make, model or year…', 'Featured vehicles'],
    pt: ['Encontre seu carro ideal no México', 'Compare anúncios de carros novos e usados publicados no México', 'Buscar por marca, modelo ou ano…', 'Veículos em destaque'],
    fr: ['Trouvez votre voiture idéale au Mexique', 'Des milliers de voitures neuves et d’occasion', 'Marque, modèle ou année…', 'Véhicules en vedette'],
    zh: ['在墨西哥找到理想汽车', '比较墨西哥发布的新车和二手车广告', '按品牌、车型或年份搜索…', '精选车辆'],
    ko: ['멕시코에서 원하는 자동차를 찾아보세요', '멕시코에 등록된 신차와 중고차 매물을 비교하세요', '브랜드, 모델 또는 연식으로 검색…', '추천 차량'],
    de: ['Finden Sie Ihr ideales Auto in Mexiko', 'Tausende Neu- und Gebrauchtwagen', 'Marke, Modell oder Baujahr…', 'Empfohlene Fahrzeuge'],
    it: ['Trova la tua auto ideale in Messico', 'Confronta annunci di auto nuove e usate pubblicati in Messico', 'Cerca per marca, modello o anno…', 'Veicoli in evidenza'],
    ar: ['اعثر على سيارتك المثالية في المكسيك', 'قارن إعلانات السيارات الجديدة والمستعملة المنشورة في المكسيك', 'ابحث حسب الماركة أو الطراز أو السنة…', 'سيارات مميزة'],
    ru: ['Найдите идеальный автомобиль в Мексике', 'Тысячи новых и подержанных автомобилей', 'Марка, модель или год…', 'Популярные автомобили'],
    ja: ['メキシコで理想の車を見つける', 'メキシコで掲載された新車・中古車の広告を比較', 'メーカー、モデル、年式で検索…', '注目の車両'],
  },
  motor: {
    es: ['Encuentra tu vehículo ideal y repuestos', 'Autos, motos, camionetas, refacciones y más al mejor precio', 'Buscar por marca, modelo, tipo…', 'Destacados en Motor'],
    en: ['Find your ideal vehicle and parts', 'Cars, bikes, trucks, parts and more at the best price', 'Search by make, model or type…', 'Featured in Motor'],
    pt: ['Encontre seu veículo ideal e peças', 'Carros, motos, caminhões, peças e muito mais', 'Buscar por marca, modelo ou tipo…', 'Destaques em Motor'],
    fr: ['Trouvez votre véhicule idéal et pièces', 'Voitures, motos, camions, pièces et plus', 'Marque, modèle ou type…', 'En vedette dans Moteur'],
    zh: ['找到理想的交通工具和配件', '汽车、摩托车、卡车、零配件等', '按品牌、车型或类型搜索…', 'Motor 精选'],
    ko: ['원하는 차량과 부품을 찾아보세요', '자동차, 오토바이, 트럭, 부품 등 다양한 매물', '브랜드, 모델 또는 유형으로 검색…', '모터 추천 매물'],
    de: ['Finden Sie Ihr ideales Fahrzeug und Teile', 'Autos, Motorräder, LKWs, Teile und mehr', 'Marke, Modell oder Typ…', 'Beliebt in Motor'],
    it: ['Trova il veicolo ideale e i ricambi', 'Auto, moto, camion, ricambi e molto altro', 'Cerca per marca, modello o tipo…', 'In evidenza in Motori'],
    ar: ['اعثر على مركبتك المثالية وقطع الغيار', 'سيارات ودراجات وشاحنات وقطع غيار والمزيد', 'ابحث حسب الماركة أو الطراز أو النوع…', 'مميز في المركبات'],
    ru: ['Найдите транспорт и запчасти в Мексике', 'Авто, мотоциклы, грузовики и автозапчасти', 'Марка, модель или тип…', 'Популярное в разделе Мотор'],
    ja: ['理想の車両とパーツを見つける', '車、バイク、トラック、部品などを探せます', 'メーカー、モデル、タイプで検索…', 'モーターの注目情報'],
  },
  inmuebles: {
    es: ['Encuentra propiedades en México', 'Explora propiedades en venta y renta publicadas en todo el país', 'Ciudad, colonia o tipo de propiedad…', 'Propiedades destacadas'],
    en: ['Find properties in Mexico', 'Buy, rent or invest in properties across the country', 'City, neighborhood or property type…', 'Featured properties'],
    pt: ['Encontre imóveis no México', 'Explore imóveis à venda e para alugar em todo o país', 'Cidade, bairro ou tipo de imóvel…', 'Imóveis em destaque'],
    fr: ['Trouvez un bien immobilier au Mexique', 'Achetez, louez ou investissez', 'Ville, quartier ou type de bien…', 'Biens en vedette'],
    zh: ['在墨西哥寻找房产', '浏览全国出售和出租的房产信息', '城市、社区或房产类型…', '精选房产'],
    ko: ['멕시코의 부동산을 찾아보세요', '전국의 매매·임대 부동산을 둘러보세요', '도시, 동네 또는 부동산 유형…', '추천 부동산'],
    de: ['Immobilien in Mexiko finden', 'Kaufen, mieten oder investieren', 'Stadt, Viertel oder Immobilientyp…', 'Empfohlene Immobilien'],
    it: ['Trova immobili in Messico', 'Esplora immobili in vendita e in affitto in tutto il Paese', 'Città, quartiere o tipo di immobile…', 'Immobili in evidenza'],
    ar: ['اعثر على عقارات في المكسيك', 'استكشف عقارات للبيع والإيجار في جميع أنحاء البلاد', 'المدينة أو الحي أو نوع العقار…', 'عقارات مميزة'],
    ru: ['Найдите недвижимость в Мексике', 'Покупайте, арендуйте и инвестируйте', 'Город, район или тип недвижимости…', 'Популярная недвижимость'],
    ja: ['メキシコの不動産を探す', '全国の売買・賃貸物件を検索', '都市、エリア、物件タイプで検索…', '注目の不動産'],
  },
  servicios: {
    es: ['Encuentra servicios profesionales', 'Compara anuncios y perfiles cerca de ti', 'Servicio, profesional o ciudad…', 'Servicios destacados'],
    en: ['Hire verified professionals', 'Trusted specialists near you', 'Service, professional or city…', 'Featured services'],
    pt: ['Encontre serviços profissionais', 'Compare anúncios e perfis perto de você', 'Serviço, profissional ou cidade…', 'Serviços em destaque'],
    fr: ['Engagez des professionnels vérifiés', 'Des spécialistes de confiance près de vous', 'Service, professionnel ou ville…', 'Services en vedette'],
    zh: ['寻找专业服务', '比较您附近的服务信息和专业人士资料', '服务、专业人士或城市…', '精选服务'],
    ko: ['전문 서비스를 찾아보세요', '내 주변 서비스와 전문가 프로필을 비교하세요', '서비스, 전문가 또는 도시…', '추천 서비스'],
    de: ['Geprüfte Fachkräfte beauftragen', 'Vertrauenswürdige Profis in Ihrer Nähe', 'Dienstleistung, Fachkraft oder Stadt…', 'Empfohlene Dienste'],
    it: ['Trova servizi professionali', 'Confronta annunci e profili vicino a te', 'Servizio, professionista o città…', 'Servizi in evidenza'],
    ar: ['اعثر على خدمات احترافية', 'قارن الإعلانات والملفات المهنية بالقرب منك', 'الخدمة أو المختص أو المدينة…', 'خدمات مميزة'],
    ru: ['Найдите проверенных специалистов', 'Надёжные специалисты рядом с вами', 'Услуга, специалист или город…', 'Популярные услуги'],
    ja: ['プロのサービスを探す', '近くのサービスや専門家プロフィールを比較', 'サービス、専門家、都市で検索…', '注目のサービス'],
  },
  empleos: {
    es: ['Encuentra trabajo en México', 'Vacantes y oportunidades laborales publicadas en todo el país', 'Puesto, empresa o ciudad…', 'Empleos recientes'],
    en: ['Find jobs in Mexico', 'Thousands of opportunities across the country', 'Job title, company or city…', 'Recent jobs'],
    pt: ['Encontre trabalho no México', 'Vagas e oportunidades publicadas em todo o país', 'Cargo, empresa ou cidade…', 'Vagas recentes'],
    fr: ['Trouvez un emploi au Mexique', 'Des milliers d’opportunités dans tout le pays', 'Poste, entreprise ou ville…', 'Offres récentes'],
    zh: ['在墨西哥找工作', '浏览全国发布的职位和就业机会', '职位、公司或城市…', '最新职位'],
    ko: ['멕시코에서 일자리를 찾아보세요', '전국에 등록된 채용 공고와 기회를 확인하세요', '직무, 회사 또는 도시…', '최근 채용'],
    de: ['Jobs in Mexiko finden', 'Tausende Stellenangebote im ganzen Land', 'Position, Unternehmen oder Stadt…', 'Aktuelle Stellen'],
    it: ['Trova lavoro in Messico', 'Offerte e opportunità di lavoro in tutto il Paese', 'Ruolo, azienda o città…', 'Offerte recenti'],
    ar: ['اعثر على عمل في المكسيك', 'وظائف وفرص عمل منشورة في جميع أنحاء البلاد', 'المسمى الوظيفي أو الشركة أو المدينة…', 'أحدث الوظائف'],
    ru: ['Найдите работу в Мексике', 'Тысячи вакансий по всей стране', 'Должность, компания или город…', 'Новые вакансии'],
    ja: ['メキシコで仕事を探す', '全国の求人・仕事情報を検索', '職種、会社、都市で検索…', '新着求人'],
  },
  productos: {
    es: ['Compra y vende artículos en México', 'Explora categorías de productos nuevos y usados publicados en México', 'Buscar productos, marcas, categorías…', 'Artículos destacados'],
    en: ['Buy and sell items in Mexico', 'Thousands of new and used products at the best price', 'Search goods, brands, categories…', 'Featured items'],
    pt: ['Compre e venda produtos no México', 'Explore produtos novos e usados anunciados no México', 'Buscar produtos, marcas, categorias…', 'Produtos em destaque'],
    fr: ['Achetez et vendez des articles au Mexique', 'Des milliers de produits neufs et d’occasion', 'Rechercher des articles, marques, catégories…', 'Articles en vedette'],
    zh: ['在墨西哥买卖商品', '浏览墨西哥发布的全新和二手商品', '搜索商品、品牌、分类…', '精选商品'],
    ko: ['멕시코에서 상품을 사고팔아 보세요', '멕시코에 등록된 새 상품과 중고 상품을 둘러보세요', '상품, 브랜드, 카테고리 검색…', '추천 상품'],
    de: ['Kaufen und verkaufen Sie Artikel in Mexiko', 'Tausende neue und gebrauchte Produkte', 'Waren, Marken, Kategorien suchen…', 'Empfohlene Artikel'],
    it: ['Compra e vendi articoli in Messico', 'Esplora prodotti nuovi e usati pubblicati in Messico', 'Cerca prodotti, marchi, categorie…', 'Articoli in evidenza'],
    ar: ['اشترِ وبِع المنتجات في المكسيك', 'استكشف المنتجات الجديدة والمستعملة المعروضة في المكسيك', 'ابحث عن منتجات أو علامات أو فئات…', 'منتجات مميزة'],
    ru: ['Покупайте и продавайте товары в Мексике', 'Тысячи новых и б/у товаров по лучшим ценам', 'Поиск товаров, брендов, категорий…', 'Популярные товары'],
    ja: ['メキシコで商品を売買', 'メキシコで出品された新品・中古品を探せます', '商品、ブランド、カテゴリで検索…', '注目の商品'],
  },
  turismo: {
    es: ['Explora el turismo y aventuras en México', 'Hoteles, hospedaje, tours, boletos a eventos y artículos de viaje', 'Buscar hoteles, tours, destinos…', 'Destacados en Turismo'],
    en: ['Explore tourism and adventures in Mexico', 'Hotels, lodging, tours, event tickets and travel gear', 'Search hotels, tours, destinations…', 'Featured in Tourism'],
    pt: ['Explore turismo e aventuras no México', 'Hotéis, hospedagem, passeios, ingressos e artigos de viagem', 'Buscar hotéis, passeios, destinos…', 'Destaques em Turismo'],
    fr: ['Découvrez le tourisme et l’aventure au Mexique', 'Hôtels, hébergement, circuits et billets', 'Rechercher des hôtels, circuits, destinations…', 'En vedette dans Tourisme'],
    zh: ['探索墨西哥旅游与精彩体验', '酒店、住宿、旅行团、活动门票和旅行用品', '搜索酒店、旅行团、目的地…', '旅游精选'],
    ko: ['멕시코의 여행과 모험을 만나보세요', '호텔, 숙박, 투어, 이벤트 티켓, 여행용품', '호텔, 투어, 여행지 검색…', '관광 추천'],
    de: ['Entdecken Sie Tourismus und Abenteuer in Mexiko', 'Hotels, Unterkünfte, Touren und Tickets', 'Nach Hotels, Touren, Zielen suchen…', 'Beliebt in Tourismus'],
    it: ['Esplora turismo e avventure in Messico', 'Hotel, alloggi, tour, biglietti per eventi e articoli da viaggio', 'Cerca hotel, tour, destinazioni…', 'In evidenza nel Turismo'],
    ar: ['استكشف السياحة والمغامرات في المكسيك', 'فنادق وإقامة وجولات وتذاكر فعاليات ومستلزمات سفر', 'ابحث عن فنادق أو جولات أو وجهات…', 'مميز في السياحة'],
    ru: ['Откройте для себя туризм и отдых в Мексике', 'Отели, жилье, туры, билеты на мероприятия и товары для туризма', 'Поиск отелей, туров, направлений…', 'Популярное в разделе Туризм'],
    ja: ['メキシコの観光とアクティビティを楽しむ', 'ホテル、宿泊、ツアー、イベントチケット、旅行用品', 'ホテル、ツアー、目的地で検索…', '観光の注目情報'],
  },
};

export const VERTICAL_KEYS = Object.freeze(['autos', 'motor', 'inmuebles', 'servicios', 'empleos', 'productos', 'turismo']);

const productSectionLabels = {
  es: ['Electrónica', 'Hogar y jardín', 'Moda y belleza', 'Ocio y hobbies', 'Infantil y bebés', 'Mascotas', 'Libros y cursos'],
  en: ['Electronics', 'Home & Garden', 'Fashion & Beauty', 'Leisure & Hobbies', 'Kids & Baby', 'Pets', 'Books & Courses'],
  pt: ['Eletrônicos', 'Casa e jardim', 'Moda e beleza', 'Lazer e hobbies', 'Infantil e bebê', 'Pets', 'Livros e cursos'],
  fr: ['Électronique', 'Maison et jardin', 'Mode et beauté', 'Loisirs et hobbies', 'Enfants et bébé', 'Animaux', 'Livres et cours'],
  zh: ['电子产品', '家居与花园', '时尚与美妆', '休闲与爱好', '儿童与婴儿', '宠物', '图书与课程'],
  ko: ['전자제품', '홈 & 가든', '패션 & 뷰티', '취미 & 여가', '키즈 & 베이비', '반려동물', '도서 & 강좌'],
  de: ['Elektronik', 'Haus & Garten', 'Mode & Beauty', 'Freizeit & Hobbys', 'Kinder & Baby', 'Haustiere', 'Bücher & Kurse'],
  it: ['Elettronica', 'Casa e giardino', 'Moda e bellezza', 'Tempo libero e hobby', 'Bambini e bebè', 'Animali', 'Libri e corsi'],
  ar: ['إلكترونيات', 'المنزل والحديقة', 'الموضة والجمال', 'الترفيه والهوايات', 'الأطفال والرضع', 'الحيوانات الأليفة', 'الكتب والدورات'],
  ru: ['Электроника', 'Дом и сад', 'Мода и красота', 'Досуг и хобби', 'Детское и для малышей', 'Животные', 'Книги и курсы'],
  ja: ['電子機器', 'ホーム＆ガーデン', 'ファッション＆ビューティー', '趣味・レジャー', 'キッズ＆ベビー', 'ペット', '本・講座'],
};

const landingUi = {
  productos: {
    es: ['Explora por categorías', 'Cómo explorar productos en Mercasto', 'Elige una categoría para consultar anuncios publicados, filtrar por ubicación y contactar directamente al anunciante. Los resultados con filtros usan páginas de búsqueda no indexables para evitar duplicados.'],
    en: ['Explore by category', 'How to explore products on Mercasto', 'Choose a category to browse published listings, filter by location and contact the advertiser directly. Filtered results use non-indexable search pages to avoid duplicate content.'],
    pt: ['Explore por categorias', 'Como explorar produtos no Mercasto', 'Escolha uma categoria para ver anúncios publicados, filtrar por localização e falar diretamente com o anunciante. Resultados com filtros usam páginas de busca não indexáveis para evitar conteúdo duplicado.'],
    fr: ['Explorer par catégorie', 'Comment explorer les produits sur Mercasto', 'Choisissez une catégorie pour consulter les annonces, filtrer par localisation et contacter directement l’annonceur. Les résultats filtrés utilisent des pages de recherche non indexables afin d’éviter les doublons.'],
    zh: ['按分类浏览', '如何在 Mercasto 浏览商品', '选择分类即可查看已发布的广告、按位置筛选并直接联系发布者。带筛选条件的结果使用不被索引的搜索页面，以避免重复内容。'],
    ko: ['카테고리별로 둘러보기', 'Mercasto에서 상품을 둘러보는 방법', '카테고리를 선택해 등록된 매물을 확인하고 위치로 필터링한 뒤 광고주에게 직접 연락하세요. 필터가 적용된 결과는 중복 콘텐츠를 막기 위해 검색엔진에 색인되지 않는 검색 페이지를 사용합니다.'],
    de: ['Nach Kategorien entdecken', 'So entdecken Sie Produkte auf Mercasto', 'Wählen Sie eine Kategorie, sehen Sie veröffentlichte Anzeigen, filtern Sie nach Standort und kontaktieren Sie den Anbieter direkt. Gefilterte Ergebnisse nutzen nicht indexierbare Suchseiten, um doppelte Inhalte zu vermeiden.'],
    it: ['Esplora per categoria', 'Come esplorare i prodotti su Mercasto', 'Scegli una categoria per consultare gli annunci pubblicati, filtrare per località e contattare direttamente l’inserzionista. I risultati filtrati usano pagine di ricerca non indicizzabili per evitare contenuti duplicati.'],
    ar: ['استكشف حسب الفئة', 'كيفية استكشاف المنتجات على Mercasto', 'اختر فئة لعرض الإعلانات المنشورة والتصفية حسب الموقع والتواصل مباشرة مع المعلن. تستخدم النتائج المفلترة صفحات بحث غير قابلة للفهرسة لتجنب المحتوى المكرر.'],
    ru: ['По категориям', 'Как искать товары на Mercasto', 'Выберите категорию, просматривайте опубликованные объявления, фильтруйте по местоположению и связывайтесь с продавцом напрямую. Результаты с фильтрами открываются на неиндексируемых страницах поиска, чтобы избежать дублей.'],
    ja: ['カテゴリから探す', 'Mercastoで商品を探す方法', 'カテゴリを選び、掲載中の広告を確認し、地域で絞り込んで出品者へ直接連絡できます。フィルター付きの結果は重複コンテンツを避けるため、検索エンジンに登録されない検索ページを使用します。'],
  },
  turismo: {
    es: ['Explora por categorías de turismo', 'Ver anuncios de turismo →', 'Mapa de turismo', 'Encuentra hospedaje y actividades cerca de ti.', 'Renta de transporte'],
    en: ['Explore tourism categories', 'View tourism listings →', 'Tourism map', 'Find lodging and activities near you.', 'Transport rental'],
    pt: ['Explore categorias de turismo', 'Ver anúncios de turismo →', 'Mapa de turismo', 'Encontre hospedagem e atividades perto de você.', 'Aluguel de transporte'],
    fr: ['Explorer les catégories de tourisme', 'Voir les annonces de tourisme →', 'Carte du tourisme', 'Trouvez des hébergements et des activités près de vous.', 'Location de transport'],
    zh: ['浏览旅游分类', '查看旅游广告 →', '旅游地图', '查找您附近的住宿和活动。', '交通工具租赁'],
    ko: ['관광 카테고리 둘러보기', '관광 매물 보기 →', '관광 지도', '내 주변 숙박과 액티비티를 찾아보세요.', '교통수단 대여'],
    de: ['Tourismuskategorien entdecken', 'Tourismus-Anzeigen ansehen →', 'Tourismuskarte', 'Finden Sie Unterkünfte und Aktivitäten in Ihrer Nähe.', 'Transportvermietung'],
    it: ['Esplora le categorie turismo', 'Vedi annunci di turismo →', 'Mappa del turismo', 'Trova alloggi e attività vicino a te.', 'Noleggio trasporti'],
    ar: ['استكشف فئات السياحة', 'عرض إعلانات السياحة →', 'خريطة السياحة', 'اعثر على أماكن إقامة وأنشطة بالقرب منك.', 'تأجير وسائل النقل'],
    ru: ['Категории туризма', 'Смотреть объявления о туризме →', 'Карта туризма', 'Найдите жильё и развлечения рядом с вами.', 'Аренда транспорта'],
    ja: ['観光カテゴリから探す', '観光の広告を見る →', '観光マップ', '近くの宿泊施設やアクティビティを探せます。', '交通機関レンタル'],
  },
};

export function hasVerticalCopyLanguage(vertical, language) {
  const lang = String(language || '').toLowerCase().split('-')[0];
  return Boolean(content[vertical]?.[lang]);
}

export function getVerticalLandingCopy(language, vertical) {
  const lang = normalizeLanguage(language);
  const values = landingUi[vertical]?.[lang] || landingUi[vertical]?.es;
  if (!values) return null;

  if (vertical === 'productos') {
    return {
      exploreTitle: values[0],
      guideTitle: values[1],
      guideBody: values[2],
      sectionLabels: productSectionLabels[lang] || productSectionLabels.es,
    };
  }

  const tourismLabels = subcategoriesByLang[lang]?.turismo || subcategoriesByLang.es.turismo;
  return {
    exploreTitle: values[0],
    viewAll: values[1],
    mapTitle: values[2],
    mapDescription: values[3],
    transportRental: values[4],
    sectionLabels: tourismLabels,
  };
}

export function hasCompleteVerticalCoverage() {
  return VERTICAL_KEYS.every(vertical => SUPPORTED_LANGUAGES.every(lang => hasVerticalCopyLanguage(vertical, lang)));
}

export function getVerticalCopy(language, vertical) {
  const lang = normalizeLanguage(language);
  const t = getTranslations(lang);
  const values = content[vertical]?.[lang] || content[vertical]?.es || content[vertical]?.en;
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
