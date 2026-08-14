import { normalizeLanguage } from './translations.js';

const copy = {
  es: {
    categories: ['Hogar', 'Reparaciones', 'Limpieza', 'Clases', 'Diseño', 'Eventos', 'Jardinería', 'Transporte', 'Mascotas', 'Cuidado', 'Electricidad'],
    mapTitle: 'Servicios en el mapa', mapDescription: 'Encuentra profesionales cerca de ti con búsqueda y filtros en pantalla completa.', mapMarkerTitle: 'Servicios en México', needsTitle: 'Qué servicio necesitas?',
    trustTitle: 'Por qué Mercasto?', trust: [
      ['Revisa el perfil', 'Consulta la información del anunciante, experiencia declarada y detalles del servicio.'],
      ['Opiniones cuando existen', 'Consulta las valoraciones disponibles y confirma referencias antes de contratar.'],
      ['Sin intermediarios', 'Contacta directamente al profesional y negocia el precio sin comisiones.'],
    ],
    ctaTitle: 'Eres profesional independiente?', ctaBody: 'Publica tus servicios gratis y conecta con clientes en tu ciudad.', ctaButton: 'Ofrecer mi servicio →',
  },
  en: {
    categories: ['Home services', 'Repairs', 'Cleaning', 'Lessons', 'Design', 'Events', 'Gardening', 'Transport', 'Pets', 'Care', 'Electrical'],
    mapTitle: 'Services on the map', mapDescription: 'Find professionals near you with full-screen search and filters.', mapMarkerTitle: 'Services in Mexico', needsTitle: 'What service do you need?',
    trustTitle: 'Why Mercasto?', trust: [
      ['Review the profile', 'Check the advertiser information, stated experience and service details.'],
      ['Reviews when available', 'Read available ratings and confirm references before hiring.'],
      ['No intermediaries', 'Contact the professional directly and negotiate the price without commissions.'],
    ],
    ctaTitle: 'Are you an independent professional?', ctaBody: 'Post your services for free and connect with clients in your city.', ctaButton: 'Offer my service →',
  },
  pt: {
    categories: ['Casa', 'Reparos', 'Limpeza', 'Aulas', 'Design', 'Eventos', 'Jardinagem', 'Transporte', 'Animais', 'Cuidados', 'Eletricidade'],
    mapTitle: 'Serviços no mapa', mapDescription: 'Encontre profissionais perto de você com busca e filtros em tela cheia.', mapMarkerTitle: 'Serviços no México', needsTitle: 'Qual serviço você precisa?',
    trustTitle: 'Por que Mercasto?', trust: [
      ['Confira o perfil', 'Veja as informações do anunciante, experiência declarada e detalhes do serviço.'],
      ['Avaliações quando disponíveis', 'Consulte avaliações disponíveis e confirme referências antes de contratar.'],
      ['Sem intermediários', 'Fale diretamente com o profissional e negocie o preço sem comissões.'],
    ],
    ctaTitle: 'Você é profissional autônomo?', ctaBody: 'Publique seus serviços grátis e encontre clientes na sua cidade.', ctaButton: 'Oferecer meu serviço →',
  },
  fr: {
    categories: ['Maison', 'Réparations', 'Nettoyage', 'Cours', 'Design', 'Événements', 'Jardinage', 'Transport', 'Animaux', 'Aide à la personne', 'Électricité'],
    mapTitle: 'Services sur la carte', mapDescription: 'Trouvez des professionnels près de chez vous avec recherche et filtres plein écran.', mapMarkerTitle: 'Services au Mexique', needsTitle: 'De quel service avez-vous besoin ?',
    trustTitle: 'Pourquoi Mercasto ?', trust: [
      ['Consultez le profil', 'Vérifiez les informations de l’annonceur, son expérience déclarée et les détails du service.'],
      ['Avis lorsqu’ils existent', 'Consultez les évaluations disponibles et confirmez les références avant d’engager.'],
      ['Sans intermédiaire', 'Contactez directement le professionnel et négociez le prix sans commission.'],
    ],
    ctaTitle: 'Vous êtes professionnel indépendant ?', ctaBody: 'Publiez vos services gratuitement et trouvez des clients dans votre ville.', ctaButton: 'Proposer mon service →',
  },
  zh: {
    categories: ['家居服务', '维修', '清洁', '课程', '设计', '活动', '园艺', '运输', '宠物', '护理', '电工'],
    mapTitle: '地图上的服务', mapDescription: '通过全屏搜索和筛选找到附近的专业人士。', mapMarkerTitle: '墨西哥服务', needsTitle: '你需要什么服务？',
    trustTitle: '为什么选择 Mercasto？', trust: [
      ['查看服务者资料', '查看发布者信息、其声明的经验和服务详情。'],
      ['有评价时参考评价', '查看已有评分，并在聘用前核实推荐或资历。'],
      ['无中间商', '直接联系专业人士，不经过平台佣金即可协商价格。'],
    ],
    ctaTitle: '你是独立专业人士吗？', ctaBody: '免费发布服务，与所在城市的客户直接联系。', ctaButton: '发布我的服务 →',
  },
  ko: {
    categories: ['홈 서비스', '수리', '청소', '수업', '디자인', '이벤트', '정원 관리', '운송', '반려동물', '돌봄', '전기'],
    mapTitle: '지도에서 서비스 보기', mapDescription: '전체 화면 검색과 필터로 가까운 전문가를 찾아보세요.', mapMarkerTitle: '멕시코 서비스', needsTitle: '어떤 서비스가 필요하신가요?',
    trustTitle: '왜 Mercasto인가요?', trust: [
      ['프로필을 확인하세요', '광고주 정보, 기재된 경력, 서비스 세부 내용을 확인하세요.'],
      ['후기가 있을 때 확인하세요', '제공되는 평가를 보고 고용 전에 추천이나 경력을 확인하세요.'],
      ['중개인 없이 직접', '전문가에게 직접 연락하고 수수료 없이 가격을 협의하세요.'],
    ],
    ctaTitle: '프리랜서 또는 독립 전문가인가요?', ctaBody: '서비스를 무료로 등록하고 도시의 고객과 연결하세요.', ctaButton: '내 서비스 등록 →',
  },
  de: {
    categories: ['Haushalt', 'Reparaturen', 'Reinigung', 'Unterricht', 'Design', 'Veranstaltungen', 'Garten', 'Transport', 'Haustiere', 'Betreuung', 'Elektrik'],
    mapTitle: 'Dienstleistungen auf der Karte', mapDescription: 'Finden Sie Fachkräfte in Ihrer Nähe mit Vollbildsuche und Filtern.', mapMarkerTitle: 'Dienstleistungen in Mexiko', needsTitle: 'Welche Dienstleistung benötigen Sie?',
    trustTitle: 'Warum Mercasto?', trust: [
      ['Profil prüfen', 'Prüfen Sie Angaben zum Inserenten, angegebene Erfahrung und Servicedetails.'],
      ['Bewertungen, wenn vorhanden', 'Lesen Sie vorhandene Bewertungen und bestätigen Sie Referenzen vor der Beauftragung.'],
      ['Ohne Vermittler', 'Kontaktieren Sie die Fachkraft direkt und verhandeln Sie ohne Provision.'],
    ],
    ctaTitle: 'Sind Sie selbstständig?', ctaBody: 'Bieten Sie Ihre Dienste kostenlos an und finden Sie Kunden in Ihrer Stadt.', ctaButton: 'Dienstleistung anbieten →',
  },
  it: {
    categories: ['Casa', 'Riparazioni', 'Pulizie', 'Lezioni', 'Design', 'Eventi', 'Giardinaggio', 'Trasporto', 'Animali', 'Assistenza', 'Elettricità'],
    mapTitle: 'Servizi sulla mappa', mapDescription: 'Trova professionisti vicino a te con ricerca e filtri a schermo intero.', mapMarkerTitle: 'Servizi in Messico', needsTitle: 'Di quale servizio hai bisogno?',
    trustTitle: 'Perché Mercasto?', trust: [
      ['Controlla il profilo', 'Consulta le informazioni dell’inserzionista, l’esperienza dichiarata e i dettagli del servizio.'],
      ['Recensioni quando disponibili', 'Consulta le valutazioni disponibili e verifica le referenze prima di assumere.'],
      ['Senza intermediari', 'Contatta direttamente il professionista e negozia il prezzo senza commissioni.'],
    ],
    ctaTitle: 'Sei un professionista indipendente?', ctaBody: 'Pubblica gratis i tuoi servizi e trova clienti nella tua città.', ctaButton: 'Offri il mio servizio →',
  },
  ar: {
    categories: ['خدمات منزلية', 'إصلاحات', 'تنظيف', 'دروس', 'تصميم', 'فعاليات', 'بستنة', 'نقل', 'حيوانات أليفة', 'رعاية', 'كهرباء'],
    mapTitle: 'الخدمات على الخريطة', mapDescription: 'اعثر على محترفين بالقرب منك عبر البحث والفلاتر بملء الشاشة.', mapMarkerTitle: 'خدمات في المكسيك', needsTitle: 'ما الخدمة التي تحتاجها؟',
    trustTitle: 'لماذا Mercasto؟', trust: [
      ['راجع الملف الشخصي', 'اطلع على معلومات صاحب الإعلان والخبرة المعلنة وتفاصيل الخدمة.'],
      ['التقييمات عند توفرها', 'راجع التقييمات المتاحة وتحقق من المراجع قبل التعاقد.'],
      ['بدون وسطاء', 'تواصل مباشرة مع المحترف وتفاوض على السعر بدون عمولات.'],
    ],
    ctaTitle: 'هل تعمل كمحترف مستقل؟', ctaBody: 'انشر خدماتك مجانًا وتواصل مع عملاء في مدينتك.', ctaButton: 'عرض خدمتي ←',
  },
  ru: {
    categories: ['Дом', 'Ремонт', 'Уборка', 'Уроки', 'Дизайн', 'Мероприятия', 'Сад', 'Перевозки', 'Животные', 'Уход', 'Электрика'],
    mapTitle: 'Услуги на карте', mapDescription: 'Ищите специалистов рядом с вами с полноэкранным поиском и фильтрами.', mapMarkerTitle: 'Услуги в Мексике', needsTitle: 'Какая услуга вам нужна?',
    trustTitle: 'Почему Mercasto?', trust: [
      ['Проверьте профиль', 'Посмотрите информацию автора объявления, заявленный опыт и детали услуги.'],
      ['Отзывы, если они есть', 'Изучите доступные оценки и проверьте рекомендации перед заказом.'],
      ['Без посредников', 'Свяжитесь со специалистом напрямую и договоритесь о цене без комиссий.'],
    ],
    ctaTitle: 'Вы независимый специалист?', ctaBody: 'Разместите свои услуги бесплатно и находите клиентов в своём городе.', ctaButton: 'Предложить услугу →',
  },
  ja: {
    categories: ['ホームサービス', '修理', '清掃', 'レッスン', 'デザイン', 'イベント', '庭仕事', '運送', 'ペット', 'ケア', '電気工事'],
    mapTitle: '地図上のサービス', mapDescription: '全画面検索とフィルターで近くの専門家を探せます。', mapMarkerTitle: 'メキシコのサービス', needsTitle: 'どのサービスが必要ですか？',
    trustTitle: 'Mercastoを選ぶ理由', trust: [
      ['プロフィールを確認', '広告主の情報、記載された経験、サービス内容を確認してください。'],
      ['口コミがあれば確認', '利用可能な評価を読み、依頼前に実績や紹介を確認してください。'],
      ['仲介なしで直接', '専門家に直接連絡し、手数料なしで価格を相談できます。'],
    ],
    ctaTitle: '独立して働く専門家ですか？', ctaBody: 'サービスを無料掲載し、あなたの街の顧客とつながりましょう。', ctaButton: 'サービスを掲載 →',
  },
};

export function getServiciosLandingCopy(language) {
  const lang = normalizeLanguage(language);
  return copy[lang] || copy.es;
}

export function hasServiciosLandingCopy(language) {
  const lang = String(language || '').toLowerCase().split('-')[0];
  return Boolean(copy[lang]);
}

export default copy;
