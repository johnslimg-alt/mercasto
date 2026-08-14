import { normalizeLanguage } from './translations.js';

export const STORE_DIRECTORY_CATEGORIES = [
  { slug: 'motor', query: 'Automotriz' },
  { slug: 'inmobiliaria', query: 'Bienes Raíces' },
  { slug: 'empleo', query: 'Empleos' },
  { slug: 'servicios', query: 'Servicios Profesionales' },
  { slug: 'informatica', query: 'Informática y Electrónica' },
  { slug: 'telefonos', query: 'Telefonía' },
  { slug: 'hogar', query: 'Hogar y Muebles' },
];

const copy = {
  es: {
    seoTitle: 'Directorio de Tiendas Oficiales y Negocios PRO | Mercasto México', seoDescription: 'Encuentra negocios y vendedores PRO verificados de Mercasto en todo México.',
    directory: 'Directorio PRO de México', title: 'Tiendas y negocios oficiales', subtitle: 'Compra directamente a vendedores profesionales y verificados en todo México.',
    search: 'Buscar tiendas por nombre o descripción...', active: 'Negocios activos', total: 'total', empty: 'No se encontraron tiendas', view: 'Ver tienda',
    trust: 'MÁS CONFIANZA', proTitle: 'Tienes un negocio o vendes con frecuencia?', proDescription: 'Únete a Mercasto PRO para crear una tienda profesional y promocionar tus productos en todo México.',
    activatePro: 'Activar perfil PRO', viewPlans: 'Ver planes', mexico: 'México', defaultDescription: 'Tienda oficial con productos y atención profesional.', bannerAlt: 'Portada de la tienda', logoAlt: 'Logo de la tienda',
    categories: { motor: 'Automotriz', inmobiliaria: 'Bienes Raíces', empleo: 'Empleos', servicios: 'Servicios Profesionales', informatica: 'Informática y Electrónica', telefonos: 'Telefonía', hogar: 'Hogar y Muebles' },
  },
  en: {
    seoTitle: 'Official Stores and PRO Businesses Directory | Mercasto Mexico', seoDescription: 'Find verified Mercasto PRO businesses and sellers throughout Mexico.',
    directory: 'Mexico PRO Directory', title: 'Official stores and businesses', subtitle: 'Buy directly from professional, verified sellers throughout Mexico.',
    search: 'Search stores by name or description...', active: 'Active businesses', total: 'total', empty: 'No stores found', view: 'View store',
    trust: 'MORE TRUST', proTitle: 'Do you run a business or sell frequently?', proDescription: 'Join Mercasto PRO to create a professional storefront and promote your products nationwide.',
    activatePro: 'Activate PRO profile', viewPlans: 'View plans', mexico: 'Mexico', defaultDescription: 'Official store with quality products and professional service.', bannerAlt: 'Store banner', logoAlt: 'Store logo',
    categories: { motor: 'Automotive', inmobiliaria: 'Real Estate', empleo: 'Jobs', servicios: 'Professional Services', informatica: 'IT & Electronics', telefonos: 'Phones', hogar: 'Home & Furniture' },
  },
  pt: {
    seoTitle: 'Diretório de Lojas Oficiais e Negócios PRO | Mercasto México', seoDescription: 'Encontre negócios e vendedores PRO verificados da Mercasto em todo o México.',
    directory: 'Diretório PRO do México', title: 'Lojas e negócios oficiais', subtitle: 'Compre diretamente de vendedores profissionais e verificados em todo o México.',
    search: 'Buscar lojas por nome ou descrição...', active: 'Negócios ativos', total: 'total', empty: 'Nenhuma loja encontrada', view: 'Ver loja',
    trust: 'MAIS CONFIANÇA', proTitle: 'Você tem um negócio ou vende com frequência?', proDescription: 'Entre no Mercasto PRO para criar uma vitrine profissional e promover seus produtos em todo o México.',
    activatePro: 'Ativar perfil PRO', viewPlans: 'Ver planos', mexico: 'México', defaultDescription: 'Loja oficial com produtos de qualidade e atendimento profissional.', bannerAlt: 'Capa da loja', logoAlt: 'Logo da loja',
    categories: { motor: 'Automotivo', inmobiliaria: 'Imóveis', empleo: 'Empregos', servicios: 'Serviços Profissionais', informatica: 'Informática e Eletrônicos', telefonos: 'Telefonia', hogar: 'Casa e Móveis' },
  },
  fr: {
    seoTitle: 'Annuaire des boutiques officielles et entreprises PRO | Mercasto Mexique', seoDescription: 'Trouvez des entreprises et vendeurs Mercasto PRO vérifiés partout au Mexique.',
    directory: 'Annuaire PRO du Mexique', title: 'Boutiques et entreprises officielles', subtitle: 'Achetez directement auprès de vendeurs professionnels et vérifiés partout au Mexique.',
    search: 'Rechercher une boutique par nom ou description...', active: 'Entreprises actives', total: 'au total', empty: 'Aucune boutique trouvée', view: 'Voir la boutique',
    trust: 'PLUS DE CONFIANCE', proTitle: 'Vous avez une entreprise ou vendez souvent?', proDescription: 'Rejoignez Mercasto PRO pour créer une vitrine professionnelle et promouvoir vos produits dans tout le Mexique.',
    activatePro: 'Activer le profil PRO', viewPlans: 'Voir les offres', mexico: 'Mexique', defaultDescription: 'Boutique officielle avec des produits de qualité et un service professionnel.', bannerAlt: 'Bannière de la boutique', logoAlt: 'Logo de la boutique',
    categories: { motor: 'Automobile', inmobiliaria: 'Immobilier', empleo: 'Emplois', servicios: 'Services professionnels', informatica: 'Informatique et électronique', telefonos: 'Téléphonie', hogar: 'Maison et meubles' },
  },
  zh: {
    seoTitle: '官方店铺与 PRO 商家目录 | Mercasto 墨西哥', seoDescription: '查找墨西哥全国经过验证的 Mercasto PRO 商家和卖家。',
    directory: '墨西哥 PRO 商家目录', title: '官方店铺与商家', subtitle: '直接向墨西哥全国的专业认证卖家购买。',
    search: '按名称或描述搜索店铺...', active: '活跃商家', total: '总计', empty: '未找到店铺', view: '查看店铺',
    trust: '更值得信赖', proTitle: '您经营企业或经常出售商品吗?', proDescription: '加入 Mercasto PRO，创建专业店铺并在墨西哥全国推广商品。',
    activatePro: '启用 PRO 资料', viewPlans: '查看方案', mexico: '墨西哥', defaultDescription: '提供优质商品和专业服务的官方店铺。', bannerAlt: '店铺封面', logoAlt: '店铺标志',
    categories: { motor: '汽车', inmobiliaria: '房地产', empleo: '招聘', servicios: '专业服务', informatica: '计算机与电子产品', telefonos: '手机通信', hogar: '家居与家具' },
  },
  ko: {
    seoTitle: '공식 스토어 및 PRO 비즈니스 디렉터리 | Mercasto 멕시코', seoDescription: '멕시코 전역의 인증된 Mercasto PRO 비즈니스와 판매자를 찾아보세요.',
    directory: '멕시코 PRO 디렉터리', title: '공식 스토어 및 비즈니스', subtitle: '멕시코 전역의 전문 인증 판매자로부터 직접 구매하세요.',
    search: '이름 또는 설명으로 스토어 검색...', active: '활성 비즈니스', total: '총', empty: '스토어를 찾을 수 없습니다', view: '스토어 보기',
    trust: '더 높은 신뢰', proTitle: '사업을 운영하거나 자주 판매하시나요?', proDescription: 'Mercasto PRO에 가입해 전문 스토어를 만들고 멕시코 전역에 상품을 홍보하세요.',
    activatePro: 'PRO 프로필 활성화', viewPlans: '플랜 보기', mexico: '멕시코', defaultDescription: '품질 좋은 상품과 전문 서비스를 제공하는 공식 스토어입니다.', bannerAlt: '스토어 배너', logoAlt: '스토어 로고',
    categories: { motor: '자동차', inmobiliaria: '부동산', empleo: '채용', servicios: '전문 서비스', informatica: 'IT 및 전자제품', telefonos: '휴대전화', hogar: '홈 및 가구' },
  },
  de: {
    seoTitle: 'Verzeichnis offizieller Shops und PRO-Unternehmen | Mercasto Mexiko', seoDescription: 'Finden Sie verifizierte Mercasto-PRO-Unternehmen und Verkäufer in ganz Mexiko.',
    directory: 'Mexiko PRO-Verzeichnis', title: 'Offizielle Shops und Unternehmen', subtitle: 'Kaufen Sie direkt bei professionellen, verifizierten Verkäufern in ganz Mexiko.',
    search: 'Shops nach Name oder Beschreibung suchen...', active: 'Aktive Unternehmen', total: 'gesamt', empty: 'Keine Shops gefunden', view: 'Shop ansehen',
    trust: 'MEHR VERTRAUEN', proTitle: 'Führen Sie ein Unternehmen oder verkaufen Sie regelmäßig?', proDescription: 'Werden Sie Mercasto PRO, erstellen Sie einen professionellen Shop und bewerben Sie Ihre Produkte in ganz Mexiko.',
    activatePro: 'PRO-Profil aktivieren', viewPlans: 'Tarife ansehen', mexico: 'Mexiko', defaultDescription: 'Offizieller Shop mit hochwertigen Produkten und professionellem Service.', bannerAlt: 'Shop-Banner', logoAlt: 'Shop-Logo',
    categories: { motor: 'Automobil', inmobiliaria: 'Immobilien', empleo: 'Jobs', servicios: 'Professionelle Dienstleistungen', informatica: 'IT & Elektronik', telefonos: 'Telefonie', hogar: 'Haus & Möbel' },
  },
  it: {
    seoTitle: 'Elenco di negozi ufficiali e attività PRO | Mercasto Messico', seoDescription: 'Trova attività e venditori Mercasto PRO verificati in tutto il Messico.',
    directory: 'Elenco PRO del Messico', title: 'Negozi e attività ufficiali', subtitle: 'Acquista direttamente da venditori professionali e verificati in tutto il Messico.',
    search: 'Cerca negozi per nome o descrizione...', active: 'Attività attive', total: 'totale', empty: 'Nessun negozio trovato', view: 'Vedi negozio',
    trust: 'PIÙ FIDUCIA', proTitle: 'Hai un’attività o vendi spesso?', proDescription: 'Passa a Mercasto PRO per creare una vetrina professionale e promuovere i tuoi prodotti in tutto il Messico.',
    activatePro: 'Attiva profilo PRO', viewPlans: 'Vedi piani', mexico: 'Messico', defaultDescription: 'Negozio ufficiale con prodotti di qualità e servizio professionale.', bannerAlt: 'Copertina del negozio', logoAlt: 'Logo del negozio',
    categories: { motor: 'Automotive', inmobiliaria: 'Immobili', empleo: 'Lavoro', servicios: 'Servizi professionali', informatica: 'Informatica ed elettronica', telefonos: 'Telefonia', hogar: 'Casa e mobili' },
  },
  ar: {
    seoTitle: 'دليل المتاجر الرسمية وشركات PRO | Mercasto المكسيك', seoDescription: 'اعثر على شركات وبائعي Mercasto PRO الموثّقين في جميع أنحاء المكسيك.',
    directory: 'دليل PRO في المكسيك', title: 'المتاجر والشركات الرسمية', subtitle: 'اشتر مباشرة من بائعين محترفين وموثّقين في جميع أنحاء المكسيك.',
    search: 'ابحث عن متجر بالاسم أو الوصف...', active: 'الشركات النشطة', total: 'الإجمالي', empty: 'لم يتم العثور على متاجر', view: 'عرض المتجر',
    trust: 'ثقة أكبر', proTitle: 'هل تدير نشاطا تجاريا أو تبيع باستمرار?', proDescription: 'انضم إلى Mercasto PRO لإنشاء واجهة متجر احترافية والترويج لمنتجاتك في جميع أنحاء المكسيك.',
    activatePro: 'تفعيل ملف PRO', viewPlans: 'عرض الخطط', mexico: 'المكسيك', defaultDescription: 'متجر رسمي يقدم منتجات عالية الجودة وخدمة احترافية.', bannerAlt: 'غلاف المتجر', logoAlt: 'شعار المتجر',
    categories: { motor: 'السيارات', inmobiliaria: 'العقارات', empleo: 'الوظائف', servicios: 'الخدمات المهنية', informatica: 'الحاسوب والإلكترونيات', telefonos: 'الهواتف', hogar: 'المنزل والأثاث' },
  },
  ru: {
    seoTitle: 'Каталог официальных магазинов и PRO-компаний | Mercasto Мексика', seoDescription: 'Найдите проверенные компании и продавцов Mercasto PRO по всей Мексике.',
    directory: 'Каталог PRO по Мексике', title: 'Официальные магазины и компании', subtitle: 'Покупайте напрямую у профессиональных проверенных продавцов по всей Мексике.',
    search: 'Найти магазин по названию или описанию...', active: 'Активные компании', total: 'всего', empty: 'Магазины не найдены', view: 'Открыть магазин',
    trust: 'БОЛЬШЕ ДОВЕРИЯ', proTitle: 'У вас бизнес или вы часто продаёте?', proDescription: 'Подключите Mercasto PRO, создайте профессиональную витрину и продвигайте товары по всей Мексике.',
    activatePro: 'Активировать профиль PRO', viewPlans: 'Посмотреть планы', mexico: 'Мексика', defaultDescription: 'Официальный магазин с качественными товарами и профессиональным обслуживанием.', bannerAlt: 'Обложка магазина', logoAlt: 'Логотип магазина',
    categories: { motor: 'Автомобили', inmobiliaria: 'Недвижимость', empleo: 'Работа', servicios: 'Профессиональные услуги', informatica: 'Компьютеры и электроника', telefonos: 'Телефоны', hogar: 'Дом и мебель' },
  },
  ja: {
    seoTitle: '公式ストアと PRO ビジネスのディレクトリ | Mercasto メキシコ', seoDescription: 'メキシコ全土の認証済み Mercasto PRO ビジネスと販売者を探せます。',
    directory: 'メキシコ PRO ディレクトリ', title: '公式ストアとビジネス', subtitle: 'メキシコ全土のプロ認証販売者から直接購入できます。',
    search: '名前または説明でストアを検索...', active: '営業中のビジネス', total: '合計', empty: 'ストアが見つかりません', view: 'ストアを見る',
    trust: 'さらに安心', proTitle: 'ビジネスを運営していますか、または頻繁に販売しますか?', proDescription: 'Mercasto PRO に参加してプロ向けストアを作成し、メキシコ全土で商品を宣伝しましょう。',
    activatePro: 'PRO プロフィールを有効化', viewPlans: 'プランを見る', mexico: 'メキシコ', defaultDescription: '高品質の商品とプロフェッショナルなサービスを提供する公式ストアです。', bannerAlt: 'ストアのバナー', logoAlt: 'ストアのロゴ',
    categories: { motor: '自動車', inmobiliaria: '不動産', empleo: '求人', servicios: '専門サービス', informatica: 'IT・電子機器', telefonos: '携帯電話', hogar: 'ホーム・家具' },
  },
};

export function getStoresDirectoryCopy(language = 'es') {
  return copy[normalizeLanguage(language)] || copy.es;
}

export function hasStoresDirectoryCopyLanguage(language) {
  const raw = String(language || '').toLowerCase().split('-')[0];
  return Object.hasOwn(copy, raw);
}

export function getStoresDirectoryCategories(language = 'es') {
  const selected = getStoresDirectoryCopy(language);
  return STORE_DIRECTORY_CATEGORIES.map(category => ({
    ...category,
    label: selected.categories[category.slug] || category.query,
  }));
}
